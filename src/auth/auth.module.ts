import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport'; // ✅ ADD THIS

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOauthService } from './google-oauth/google-oauth/google-oauth.service';
import { OtpService } from './otp/otp/otp.service';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from './otp/otp/otp.schema';
import { JwtStrategy } from './jwt/jwt/jwt.strategy';
import { JwtAuthGuard } from './jwt/jwt/jwt-auth.guard';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    UserModule,
    ConfigModule,

    // ✅ REQUIRED FOR req.user
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'), // 🔥 FIXED
        signOptions: { expiresIn: '2h' },
      }),
    }),

    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
    ]),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    GoogleOauthService,
    OtpService,
  ],
  exports: [
    JwtModule,
    PassportModule, // ✅ export if used elsewhere
    OtpService,
  ],
})
export class AuthModule {}
