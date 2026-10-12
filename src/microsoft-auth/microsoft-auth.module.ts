import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import jwksClient from 'jwks-rsa';
import { MICROSOFT_JWKS_CLIENT } from './microsoft-auth.constants';
import { MicrosoftAuthController } from './microsoft-auth.controller';
import { MicrosoftAuthGuard } from './microsoft-auth.guard';
import { MicrosoftAuthService } from './microsoft-auth.service';

const DEFAULT_AUTHORITY = 'https://login.microsoftonline.com/common';
const AUTHORITY_PATH_PATTERN = /^\/(common|organizations|consumers|[0-9a-f-]{36})$/i;

function createJwksClient(configService: ConfigService) {
  const authority = configService
    .get<string>('MICROSOFT_AUTHORITY', DEFAULT_AUTHORITY)
    .replace(/\/+$/, '');
  let parsedAuthority: URL;

  try {
    parsedAuthority = new URL(authority);
  } catch {
    throw new Error('MICROSOFT_AUTHORITY must be a valid Microsoft authority URL');
  }

  if (
    parsedAuthority.protocol !== 'https:' ||
    parsedAuthority.hostname !== 'login.microsoftonline.com' ||
    parsedAuthority.search ||
    parsedAuthority.hash ||
    parsedAuthority.username ||
    parsedAuthority.password ||
    !AUTHORITY_PATH_PATTERN.test(parsedAuthority.pathname)
  ) {
    throw new Error('MICROSOFT_AUTHORITY must use a supported login.microsoftonline.com authority');
  }

  return jwksClient({
    jwksUri: `${authority}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
  });
}

@Module({
  imports: [ConfigModule],
  controllers: [MicrosoftAuthController],
  providers: [
    MicrosoftAuthService,
    MicrosoftAuthGuard,
    {
      provide: MICROSOFT_JWKS_CLIENT,
      inject: [ConfigService],
      useFactory: createJwksClient,
    },
  ],
})
export class MicrosoftAuthModule {}