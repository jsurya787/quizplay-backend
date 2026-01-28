import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import axios from 'axios';
import * as qs from 'qs';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
const SALT_ROUNDS = 10;


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
  );

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  // ============================
  // GOOGLE LOGIN
  // ============================
  async loginWithGoogle(code: string, host: string) {
    try {
      let redirectUri = 'http://localhost:4200/auth/google/callback';

      if (host.includes('www.quizplay.co.in')) {
        redirectUri = 'https://www.quizplay.co.in/auth/google/callback';
      } else if (host.includes('quizplay.co.in')) {
        redirectUri = 'https://quizplay.co.in/auth/google/callback';
      }

      console.log('redirectUri---->', redirectUri);

      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
           // process.env.GOOGLE_REDIRECT_URI ||
           // 'https://quizplay.co.in/auth/google/callback',  
            //'http://localhost:4200/auth/google/callback',
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const { id_token } = tokenResponse.data;
      if (!id_token) {
        throw new UnauthorizedException('No id_token returned from Google');
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID!,
      });

      const googlePayload = ticket.getPayload();
      if (!googlePayload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const user = await this.userService.findOrCreateByGoogle(googlePayload);
      return { ...(await this.generateTokens(user)), user };
    } catch (error) {
      this.logger.error('Google login failed', error);
      throw new InternalServerErrorException('Google login failed');
    }
  }

  // ============================
  // TOKEN GENERATION
  // ============================
  async generateTokens(user: any) {
    const userId = user._id.toString();

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, role: user.role, email: user.email },
      {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: '24m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  // ============================
  // REFRESH ACCESS TOKEN
  // ============================
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const accessToken = await this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          role: user.role,       // ✅ RE-ADD
          email: user.email,     // ✅ RE-ADD
        },
        {
          secret: process.env.JWT_ACCESS_SECRET!,
          expiresIn: '24m',
        },
      );

      return {
        accessToken,
        user: this.buildUserData(user),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }


  private buildUserData(user: any) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
    // picture: user.picture,
      role: user.role || 'user',
    };
  }

  // ============================
  // OTP LOGIN
  // ============================
  async verifyOtpAndLogin(phone: string, otp: string) {
    const user = await this.userService.findOrCreateByPhone(phone);
    return { ...(await this.generateTokens(user)), user };
  }

  async loginWithPassword(email: string, password: string) {
    const user = await this.validatePassword(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { ...(await this.generateTokens(user)), user };
  }

  async validatePassword(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password) return null;

    const ok = await bcrypt.compare(password, user.password);
    return ok ? user : null;
  }

  async setPassword(userId: string, password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters',
      );
    }

    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // ❌ Prevent overwriting password
    if (user.password) {
      throw new BadRequestException('Password already set');
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await this.userService.updatePassword(userId, hashedPassword);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }

}
