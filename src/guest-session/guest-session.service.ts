import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GuestSession, GuestSessionDocument } from './guest-session.schema';
import * as crypto from 'crypto';

@Injectable()
export class GuestSessionService {
  // 🎯 Rate limit: 5 attempts per hour
  private readonly MAX_ATTEMPTS_PER_HOUR = 5;

  // 📈 Global limit: 10 total quizzes per guest
  private readonly MAX_GLOBAL_ATTEMPTS = 2;

  constructor(
    @InjectModel(GuestSession.name)
    private readonly guestSessionModel: Model<GuestSessionDocument>,
  ) {}

  /**
   * 🔐 Generate unique fingerprint from IP + User-Agent
   */
  generateFingerprint(ip: string, userAgent: string): string {
    const data = `${ip}:${userAgent}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 🎫 Generate secure random session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 🆕 Create or retrieve existing guest session
   */
  async createOrGetSession(fingerprint: string): Promise<GuestSessionDocument> {
    // Check if session already exists
    let session = await this.guestSessionModel.findOne({ fingerprint });

    if (session) {
      // Update last activity and extend expiration
      session.lastActivityAt = new Date();
      session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await session.save();
      return session;
    }

    // Create new session
    const sessionToken = this.generateSessionToken();
    session = await this.guestSessionModel.create({
      fingerprint,
      sessionToken,
      attemptsThisHour: 0,
      rateLimitWindowStart: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(),
    });

    return session;
  }

  /**
   * ✅ Validate session token from cookie
   */
  async validateSession(sessionToken: string): Promise<GuestSessionDocument> {
    const session = await this.guestSessionModel.findOne({ sessionToken });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      await this.guestSessionModel.deleteOne({ _id: session._id });
      throw new UnauthorizedException('Session expired');
    }

    // Update last activity
    session.lastActivityAt = new Date();
    session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await session.save();

    return session;
  }

  /**
   * ⏱️ Check and enforce rate limit (5 attempts/hour)
   */
  async checkRateLimit(sessionId: string): Promise<void> {
    const session = await this.guestSessionModel.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Reset counter if window expired
    if (session.rateLimitWindowStart < hourAgo) {
      session.attemptsThisHour = 0;
      session.rateLimitWindowStart = now;
    }

    // Check if limit exceeded
    if (session.attemptsThisHour >= this.MAX_ATTEMPTS_PER_HOUR) {
      const resetTime = new Date(
        session.rateLimitWindowStart.getTime() + 60 * 60 * 1000,
      );
      const minutesLeft = Math.ceil(
        (resetTime.getTime() - now.getTime()) / (60 * 1000),
      );

      throw new HttpException(
        `Rate limit exceeded. Try again in ${minutesLeft} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    session.attemptsThisHour += 1;
    await session.save();
  }

  /**
   * 📈 Check and enforce global quiz limit (10 quizzes lifetime)
   */
  async checkGlobalLimit(sessionId: string): Promise<void> {
    const session = await this.guestSessionModel.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.totalQuizzesPlayed >= this.MAX_GLOBAL_ATTEMPTS) {
      throw new HttpException(
        "You've reached the guest limit of 10 quizzes. Please login to continue playing – it's completely free!",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * 📈 Increment the total quizzes played counter
   */
  async incrementTotalQuizzes(sessionId: string): Promise<void> {
    await this.guestSessionModel.findByIdAndUpdate(sessionId, {
      $inc: { totalQuizzesPlayed: 1 },
    });
  }

  /**
   * 🔍 Get session by ID
   */
  async getSessionById(sessionId: string): Promise<GuestSessionDocument> {
    const session = await this.guestSessionModel.findById(sessionId);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }
    return session;
  }
}
