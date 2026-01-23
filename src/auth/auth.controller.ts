import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp/otp.service';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  // ============================
  // GOOGLE LOGIN (OAuth Code)
  // ============================
  @Post('google')
  async loginWithGoogle(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.loginWithGoogle(code);

    // 🍪 SET REFRESH TOKEN AS HTTP-ONLY COOKIE
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,        // 🔥 MUST be false on localhost
      sameSite: 'lax',      // 🔥 IMPORTANT for OAuth redirects
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });


    return { accessToken, user };
  }

  // ============================
  // REFRESH ACCESS TOKEN
  // ============================
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    return this.authService.refreshAccessToken(refreshToken);
  }

  // ============================
  // OTP SEND
  // ============================
  @Post('otp/send')
  async sendOtp(@Body('phone') phone: string) {
    return this.otpService.sendOtp(phone);
  }

  // ============================
  // OTP VERIFY + LOGIN
  // ============================
  @Post('otp/verify')
  async verifyOtpAndLogin(
    @Body('phone') phone: string,
    @Body('otp') otp: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.verifyOtpAndLogin(phone, otp);

    // 🍪 SET REFRESH COOKIE FOR OTP LOGIN TOO
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', {
      path: '/auth/refresh',
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // true in prod HTTPS
    });

    return { success: true };
  }

}
