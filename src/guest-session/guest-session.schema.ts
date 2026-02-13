import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class GuestSession {
  // 🔐 Unique fingerprint hash (SHA-256 of IP + User-Agent)
  @Prop({ required: true, unique: true, index: true })
  fingerprint: string;

  // 🎫 Secure session token (stored in HTTP-only cookie)
  @Prop({ required: true, unique: true, index: true })
  sessionToken: string;

  // 📊 Rate limiting: track attempts in current hour
  @Prop({ default: 0 })
  attemptsThisHour: number;

  // 📈 Global limit: track total quizzes played
  @Prop({ default: 0 })
  totalQuizzesPlayed: number;

  // ⏰ Timestamp of current rate limit window
  @Prop({ default: () => new Date() })
  rateLimitWindowStart: Date;

  // 🕐 Session expiration (24 hours from last activity)
  @Prop({ default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) })
  expiresAt: Date;

  // 📝 Last activity timestamp (updated on each request)
  @Prop({ default: () => new Date() })
  lastActivityAt: Date;
}

export type GuestSessionDocument = GuestSession & Document;
export const GuestSessionSchema = SchemaFactory.createForClass(GuestSession);

// 🗑️ Auto-delete expired sessions
GuestSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
