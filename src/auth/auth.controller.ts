import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp/otp.service';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './jwt/jwt/jwt-auth.guard';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';


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
    @Req() req: Request,
  ) {
    const clientOrigin = req.headers['x-client-origin'] || '';
    const { accessToken, refreshToken, user } =
      await this.authService.loginWithGoogle(code, clientOrigin as string);
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
  // SIGNUP (Email OTP)
  // ============================
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }


  // ============================
  // OTP SEND (Phone)
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
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.verifyOtpAndLogin(dto.email, dto.otp, 'email');

    // 🍪 refresh token cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false, // true in prod HTTPS
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user, success: true, message: 'OTP verified' };
  }

  @Post('otp/resend')
  async resendOtp(@Body('email') email: string) {
    return this.otpService.sendEmailOtp(email);
  }



  // ============================
  // LOGIN (OAuth Code)
  // ============================
  @Post('login')
  async loginWithPassword(
    @Body('email') email: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.loginWithPassword(email, password);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,          // true in prod HTTPS
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user };
  }

  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  async setPassword(
    @Req() req: any,
    @Body('password') password: string,
  ) {
    const userId = req.user.sub; // from JWT
    return this.authService.setPassword(userId, password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
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
