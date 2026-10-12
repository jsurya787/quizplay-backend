export const MICROSOFT_JWKS_CLIENT = 'MICROSOFT_JWKS_CLIENT';

export interface MicrosoftSigningKey {
  getPublicKey(): string;
}

export interface MicrosoftJwksClient {
  getSigningKey(kid: string): Promise<MicrosoftSigningKey>;
}

export interface MicrosoftUserClaims {
  name?: string;
  preferred_username?: string;
  oid?: string;
  tid: string;
}