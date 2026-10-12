import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { MICROSOFT_JWKS_CLIENT } from './microsoft-auth.constants';
import type {
  MicrosoftJwksClient,
  MicrosoftUserClaims,
} from './microsoft-auth.constants';

const DEFAULT_AUTHORITY = 'https://login.microsoftonline.com/common';
const DEFAULT_AUDIENCE = 'e5d02b87-801a-4c14-bba4-7fa58bf43949';
const DEFAULT_SCOPE = 'access_as_user';
const MICROSOFT_CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a3040b66dad';
const TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class MicrosoftAuthService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(MICROSOFT_JWKS_CLIENT)
    private readonly jwksClient: MicrosoftJwksClient,
  ) {}

  async verifyAccessToken(token: string): Promise<MicrosoftUserClaims> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded.payload === 'string') {
      throw new UnauthorizedException('Invalid Microsoft access token');
    }

    const tenantId = decoded.payload.tid;
    if (
      decoded.header.alg !== 'RS256' ||
      typeof decoded.header.kid !== 'string' ||
      !decoded.header.kid ||
      typeof tenantId !== 'string' ||
      (!TENANT_ID_PATTERN.test(tenantId) &&
        tenantId.toLowerCase() !== MICROSOFT_CONSUMER_TENANT_ID) ||
      decoded.payload.ver !== '2.0'
    ) {
      throw new UnauthorizedException('Invalid Microsoft access token');
    }

    const audience = this.configService.get<string>(
      'MICROSOFT_API_CLIENT_ID',
      DEFAULT_AUDIENCE,
    );
    const issuer = `${this.authorityOrigin()}/${tenantId}/v2.0`;

    try {
      const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid);
      const verified = jwt.verify(token, signingKey.getPublicKey(), {
        algorithms: ['RS256'],
        audience,
        issuer,
      });

      if (
        typeof verified === 'string' ||
        !verified ||
        typeof verified.tid !== 'string' ||
        verified.tid !== tenantId ||
        verified.ver !== '2.0'
      ) {
        throw new UnauthorizedException('Invalid Microsoft access token');
      }

      const requiredScope = this.configService.get<string>(
        'MICROSOFT_REQUIRED_SCOPE',
        DEFAULT_SCOPE,
      );
      const scopes = typeof verified.scp === 'string' ? verified.scp.split(/\s+/) : [];
      if (!scopes.includes(requiredScope)) {
        throw new ForbiddenException('Microsoft access token is missing the required scope');
      }

      return {
        name: this.stringClaim(verified.name),
        preferred_username: this.stringClaim(verified.preferred_username),
        oid: this.stringClaim(verified.oid),
        tid: verified.tid,
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid Microsoft access token');
    }
  }

  private authorityOrigin(): string {
    const authority = this.configService.get<string>(
      'MICROSOFT_AUTHORITY',
      DEFAULT_AUTHORITY,
    );
    return new URL(authority).origin;
  }

  private stringClaim(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}