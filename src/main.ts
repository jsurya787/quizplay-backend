import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as express from 'express';

function parseCorsOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\/+$/, '')); // strip trailing slash
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🍪 MUST be before routes
  app.use(cookieParser());

  // 🛡️ SECURITY HEADERS (Manual implementation as Helmet substitute)
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'"); // Adjust as needed
    res.setHeader('X-Powered-By', 'QuizPlay Engine'); // Custom branding / hide Nest/Express
    next();
  });

  // 🔐 CORS (credential-safe)
  const allowedOrigins = new Set<string>([
    // local dev
    'http://localhost:4200',
    'http://localhost:8100',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:8100',
    'capacitor://localhost',
    'ionic://localhost',

    // production
    'https://quizplay.co.in',
    'https://www.quizplay.co.in',

    // optional extra origins (comma-separated)
    ...parseCorsOrigins(process.env.CORS_ORIGINS),
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, server-to-server) may not send Origin.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      // Dev convenience: allow any localhost / 127.0.0.1 port in non-production.
      if (process.env.NODE_ENV !== 'production') {
        try {
          const url = new URL(normalizedOrigin);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return callback(null, true);
          }
        } catch {
          // ignore invalid origins
        }
      }

      // Allow any subdomain of quizplay.co.in (e.g., https://app.quizplay.co.in)
      try {
        const url = new URL(normalizedOrigin);
        if (
          url.hostname === 'quizplay.co.in' ||
          url.hostname.endsWith('.quizplay.co.in')
        ) {
          return callback(null, true);
        }
      } catch {
        // ignore invalid origins
      }

      // Don't throw an error (it becomes a 500 and looks like "CORS failed" in the browser).
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    // Don't hardcode allowed headers; let the CORS middleware reflect requested headers.
    optionsSuccessStatus: 204,
  });


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
    app.use('/uploads', express.static('uploads'));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap();
