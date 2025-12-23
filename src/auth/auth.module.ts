import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOauthService } from './google-oauth/google-oauth/google-oauth.service';
import { OtpService } from './otp/otp/otp.service';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from './otp/otp/otp.schema';

@Module({
  imports: [
    UserModule,
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),

    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleOauthService,
    OtpService,
  ],
  exports: [
    JwtModule,OtpService // 👈 allows other modules to use JwtService if needed
  ],
})
export class AuthModule {}
