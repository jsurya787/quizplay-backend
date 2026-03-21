import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp/otp.service';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './jwt/jwt/jwt-auth.guard';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QuizService } from '../quiz/quiz.service';
import { QuizPlayerService } from '../quiz-player/quiz-player.service';
import { UserService } from '../user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly quizService: QuizService,
    private readonly quizPlayerService: QuizPlayerService,
    private readonly userService: UserService,
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
    const clientOriginHeader = req.headers['x-client-origin'];
    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;
    const clientOrigin =
      (typeof clientOriginHeader === 'string' && clientOriginHeader) ||
      (typeof originHeader === 'string' && originHeader) ||
      (typeof refererHeader === 'string' && refererHeader) ||
      '';
    const { accessToken, refreshToken, user } =
      await this.authService.loginWithGoogle(code, clientOrigin as string);
    // 🍪 SET REFRESH TOKEN AS HTTP-ONLY COOKIE
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,        // 🔥 MUST be false on localhost
      sameSite: 'lax',      // 🔥 IMPORTANT for OAuth redirects
      path: '/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });


    return { accessToken, user };
  }

  // ============================
  // NATIVE GOOGLE LOGIN (idToken from native SDK)
  // ============================
  @Post('google/native')
  async loginWithGoogleNative(
    @Body('idToken') idToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.loginWithGoogleNative(idToken);

    // 🍪 Cookie config for native Capacitor apps (HTTPS API + capacitor:// origin)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user };
  }

  // ============================
  // REFRESH ACCESS TOKEN
  // ============================
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.body?.refreshToken || req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    return this.authService.refreshAccessToken(refreshToken);
  }

  // ============================
  // SIGNUP (Email OTP)
  // ============================
  @Post('signup')
  async signup(@Body() dto: SignupDto, @Req() req: Request) {
    return this.authService.signup(dto, req.ip);
  }


  // ============================
  // OTP SEND (Phone)
  // ============================
  @Post('otp/send')
  async sendOtp(@Body('phone') phone: string, @Req() req: Request) {
    return this.otpService.sendOtp(phone, req.ip);
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
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user, success: true, message: 'OTP verified' };
  }

  @Post('otp/resend')
  async resendOtp(@Body('email') email: string, @Req() req: Request) {
    return this.otpService.sendEmailOtp(email, req.ip);
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
      maxAge: 30 * 24 * 60 * 60 * 1000,
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

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(@Req() req: any) {
    const userId = req.user.sub;
    const role = req.user.role; // Extract the user's role from the token

    const response: any = { success: true, data: {} };

    // Common for both Students and Teachers 
    // Fetch total number of created quizzes from DB/cache logic handled in quizService
    const createdQuizzes = await this.quizService.getCreatedQuizzes(userId);
    response.data.totalQuizzesCreated = createdQuizzes.data;

    const quizzesList = await this.quizService.getCreatedQuizzesList(userId);
    response.data.createdQuizzesList = quizzesList.data;

    // Fetch Attempted Count (Common for all roles)
    const attemptedCount = await this.quizPlayerService.getAttemptedQuizzesCount(userId);
    response.data.totalQuizzesAttempted = attemptedCount.count;

    // Fetch Role-Specific Data
    if (role === 'TEACHER') {
      const instituteData = await this.userService.getTeacherInstitute(userId);
      response.data.instituteDetails = instituteData.data;
    }

    return response;
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string, @Req() req: Request) {
    return this.authService.forgotPassword(email, req.ip);
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
