import type { CookieOptions } from 'express';

type SameSite = 'lax' | 'strict' | 'none';

function parseSameSite(value: string | undefined): SameSite | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'lax') return 'lax';
  if (normalized === 'strict') return 'strict';
  if (normalized === 'none') return 'none';
  return undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
}

function baseCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';

  const secureEnv = parseBoolean(process.env.COOKIE_SECURE);
  const secure = secureEnv ?? isProd;

  const sameSiteEnv = parseSameSite(process.env.COOKIE_SAMESITE);
  let sameSite: SameSite = sameSiteEnv ?? (secure ? 'none' : 'lax');

  // Chrome rejects SameSite=None cookies unless Secure=true.
  if (sameSite === 'none' && !secure) {
    sameSite = 'lax';
  }

  const domain = process.env.COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure,
    sameSite,
    ...(domain ? { domain } : {}),
  };
}

export function refreshTokenCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    path: '/auth/refresh',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export function guestSessionCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

