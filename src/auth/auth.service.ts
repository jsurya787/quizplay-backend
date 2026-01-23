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
  async loginWithGoogle(code: string) {
    try {
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri:
            process.env.GOOGLE_REDIRECT_URI ||
            'http://localhost:4200/auth/google/callback',
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
      { sub: userId, role: user.role },
      {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: '15m',
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

      const accessToken = await this.jwtService.signAsync(
        { sub: payload.sub },
        {
          secret: process.env.JWT_ACCESS_SECRET!,
          expiresIn: '15m',
        },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ============================
  // OTP LOGIN
  // ============================
  async verifyOtpAndLogin(phone: string, otp: string) {
    const user = await this.userService.findOrCreateByPhone(phone);
    return { ...(await this.generateTokens(user)), user };
  }
}
