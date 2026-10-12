import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import {
  MicrosoftJwksClient,
  MicrosoftSigningKey,
} from './microsoft-auth.constants';
import { MicrosoftAuthGuard } from './microsoft-auth.guard';
import { MicrosoftAuthService } from './microsoft-auth.service';

const AUDIENCE = 'e5d02b87-801a-4c14-bba4-7fa58bf43949';
const TENANT_ID = '11111111-2222-4333-8444-555555555555';
const PERSONAL_TENANT_ID = '9188040d-6c67-4c5b-b112-36a3040b66dad';
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;

describe('MicrosoftAuthService', () => {
  const signingKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const otherSigningKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKey = signingKeys.publicKey.export({ format: 'pem', type: 'spki' }).toString();
  let service: MicrosoftAuthService;
  let jwksClient: MicrosoftJwksClient;

  function createToken(
    claims: Record<string, unknown> = {},
    privateKey = signingKeys.privateKey,
  ): string {
    return jwt.sign(
      {
        aud: AUDIENCE,
        iss: ISSUER,
        tid: TENANT_ID,
        ver: '2.0',
        scp: 'openid access_as_user',
        name: 'Ada Lovelace',
        preferred_username: 'ada@example.com',
        oid: 'user-object-id',
        ...claims,
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key',
        ...(claims.exp === undefined ? { expiresIn: 3600 } : {}),
      },
    );
  }

  beforeEach(() => {
    const signingKey: MicrosoftSigningKey = { getPublicKey: () => publicKey };
    jwksClient = { getSigningKey: jest.fn().mockResolvedValue(signingKey) };
    const config = {
      get: (_name: string, defaultValue: string) => defaultValue,
    } as unknown as ConfigService;
    service = new MicrosoftAuthService(config, jwksClient);
  });

  it('rejects an invalid signature', async () => {
    const token = createToken({}, otherSigningKeys.privateKey);
    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const token = createToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token that is not yet valid', async () => {
    const token = createToken({ nbf: Math.floor(Date.now() / 1000) + 3600 });
    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an incorrect audience', async () => {
    const token = createToken({ aud: 'another-api-client-id' });
    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an invalid issuer', async () => {
    const token = createToken({ iss: `https://untrusted.example/${TENANT_ID}/v2.0` });
    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('forbids a valid token that lacks the delegated scope', async () => {
    const token = createToken({ scp: 'openid User.Read' });
    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns selected claims for a valid organizational or personal-account token', async () => {
    const token = createToken();
    await expect(service.verifyAccessToken(token)).resolves.toEqual({
      name: 'Ada Lovelace',
      preferred_username: 'ada@example.com',
      oid: 'user-object-id',
      tid: TENANT_ID,
    });
  });

  it('accepts a token issued to a personal Microsoft account', async () => {
    const token = createToken({
      tid: PERSONAL_TENANT_ID,
      iss: `https://login.microsoftonline.com/${PERSONAL_TENANT_ID}/v2.0`,
    });

    await expect(service.verifyAccessToken(token)).resolves.toEqual({
      name: 'Ada Lovelace',
      preferred_username: 'ada@example.com',
      oid: 'user-object-id',
      tid: PERSONAL_TENANT_ID,
    });
  });
});

describe('MicrosoftAuthGuard', () => {
  it('returns 401 when the bearer token is missing', async () => {
    const microsoftAuthService = {
      verifyAccessToken: jest.fn(),
    } as unknown as MicrosoftAuthService;
    const guard = new MicrosoftAuthGuard(microsoftAuthService);
    const request = { headers: {} };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(microsoftAuthService.verifyAccessToken).not.toHaveBeenCalled();
  });
});