import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp/otp.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    console.log("googleLogin ------");
    return this.authService.loginWithGoogle(idToken);
  }

  @Post('otp/send')
  async sendOtp(@Body('phone') phone: string) {
    console.log("sendOtp ------", phone);
    return this.otpService.sendOtp(phone);
  }

  @Post('otp/verify')
  async verifyOtpAndLogin(@Body('phone') phone: string, @Body('otp') otp: string) {
    console.log("verifyOtpAndLogin ------");
    return this.authService.verifyOtpAndLogin(phone, otp);
  }
}
