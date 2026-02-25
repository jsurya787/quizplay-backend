import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import axios from 'axios';
import * as qs from 'qs';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp/otp/otp.service';
import { SignupDto } from './dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    private readonly otpService: OtpService,
  ) {}

  private resolveGoogleRedirectUri(clientOriginOrReferrer: string): string {
    const fallback = 'http://localhost:4200/auth/google/callback';
    if (!clientOriginOrReferrer) {
      return fallback;
    }

    let normalized = clientOriginOrReferrer.trim();
    if (
      !normalized.startsWith('http://') &&
      !normalized.startsWith('https://') &&
      !normalized.startsWith('capacitor://')
    ) {
      normalized = `https://${normalized}`;
    }

    try {
      const parsed = new URL(normalized);
      const origin = `${parsed.protocol}//${parsed.host}`;

      if (parsed.protocol === 'capacitor:') {
        return 'capacitor://localhost/auth/google/callback';
      }

      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      ) {
        return `${origin}/auth/google/callback`;
      }

      if (
        parsed.hostname === 'quizplay.co.in' ||
        parsed.hostname === 'www.quizplay.co.in'
      ) {
        return `${origin}/auth/google/callback`;
      }
    } catch {
      // Ignore parse errors and use fallback.
    }

    return fallback;
  }

  // ============================
  // GOOGLE LOGIN
  // ============================
  async loginWithGoogle(code: string, host: string) {
    try {
      const redirectUri = this.resolveGoogleRedirectUri(host);

      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
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
      if (user?.isActive === false) {
        throw new ForbiddenException('Your account is inactive. Please contact admin.');
      }
      return { ...(await this.generateTokens(user)), user: this.buildUserData(user) };
    } catch (error) {
      const exchangeError = axios.isAxiosError(error) ? error.response?.data : null;
      this.logger.error(
        `Google login failed. origin=${host} error=${JSON.stringify(exchangeError || error)}`,
      );
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        throw new BadRequestException(
          'Google OAuth token exchange failed. Check authorized redirect URI configuration.',
        );
      }
      throw new InternalServerErrorException('Google login failed');
    }
  }

  // ============================
  // TOKEN GENERATION
  // ============================
  async generateTokens(user: any) {
    const userId = user._id.toString();

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, role: user.role, email: user.email, batchIds: user.batchIds || [], teachers: user.teachers || [] },
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
      if (user?.isActive === false) {
        throw new ForbiddenException('Your account is inactive. Please contact admin.');
      }

      const accessToken = await this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          role: user.role,       // ✅ RE-ADD
          email: user.email,     // ✅ RE-ADD
          batchIds: user.batchIds || [],
          teachers: user.teachers || [],
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
      firstName: user.firstName,
      lastName: user.lastName,
      sex: user.sex || null,
      about: user.about || '',
      //batchIds: user.batchIds || [],
      teachers: user.teachers || []
    };
  }

  // ============================
  // OTP LOGIN / SIGNUP
  // ============================
  async signup(sinedUpUser: SignupDto, ip?: string) {
    const { email } = sinedUpUser;
    const user = await this.userService.findOrCreateByEmailForSignup(sinedUpUser);

    if (user.isVerified) {
      throw new BadRequestException('Email already verified. Please login.');
    }

    await this.otpService.sendEmailOtp(email, ip);

    return {
      success: true,
      message: 'OTP sent to email',
    };
  }


  async verifyOtpAndLogin(identifier: string, otp: string, type: 'phone' | 'email' = 'phone') {
    // 1. Verify OTP
    await this.otpService.verifyOtp(identifier, otp, type);

    // 2. Find or Create User
    let user;
    if (type === 'email') {
      user = await this.userService.findOrCreateByEmail(identifier);
      if (!user.isVerified) {
        await this.userService.markAsVerified(user._id.toString());
      }
    } else {
      user = await this.userService.findOrCreateByPhone(identifier);
    }
    if (user?.isActive === false) {
      throw new ForbiddenException('Your account is inactive. Please contact admin.');
    }

    // 3. Generate Tokens
    return { ...(await this.generateTokens(user)), user: this.buildUserData(user) };
  }

  async loginWithPassword(email: string, password: string) {
    const user = await this.validatePassword(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user?.isActive === false) {
      throw new ForbiddenException('Your account is inactive. Please contact admin.');
    }

    return { ...(await this.generateTokens(user)), user: this.buildUserData(user) };
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

  async forgotPassword(email: string, ip?: string) {
    const isUser = await  this.userService.forgotPassword(email);
    console.log('isUser===>', isUser);
    if(isUser){
      await this.otpService.sendEmailOtp(email, ip);
      return {
        success: true,
        message: 'OTP sent to email',
      };
    }else{
      return {
        success: false,
        message: 'User not found',
      };
    }
    
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.userService.updateBasicProfile(userId, dto);
  }

  // ============================
  // NATIVE GOOGLE LOGIN (idToken from native SDK)
  // ============================
  async loginWithGoogleNative(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID!,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const user = await this.userService.findOrCreateByGoogle(payload);
      if (user?.isActive === false) {
        throw new ForbiddenException(
          'Your account is inactive. Please contact admin.',
        );
      }

      return {
        ...(await this.generateTokens(user)),
        user: this.buildUserData(user),
      };
    } catch (error) {
      this.logger.error(`Native Google login failed: ${error}`);
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Google login failed');
    }
  }

}
