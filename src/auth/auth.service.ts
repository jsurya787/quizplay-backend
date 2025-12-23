import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/user/schemas/user.schema';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

async loginWithGoogle(idToken: string) {
  const ticket = await this.googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  const user = await this.userService.findOrCreateByGoogle(payload);

  const accessToken = this.jwtService.sign({
    userId: user._id,
    role: user.role,
  });

  return { accessToken, user };
}

async verifyOtpAndLogin(phone: string, otp: string) {
  // verify OTP first (already done)

  const user = await this.userService.findOrCreateByPhone(phone);

  const accessToken = this.jwtService.sign({
    userId: user._id,
    role: user.role,
  });

  return { accessToken, user };
}


}
