import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as express from 'express';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

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
  app.enableCors({
    origin: (origin, callback) => {
      const defaultAllowedOrigins = [
        'http://localhost:4200',
        'http://localhost:8100',
        'http://localhost',
        'https://localhost',
        'capacitor://localhost',
        'ionic://localhost',
        'https://quizplay.co.in',
        'https://www.quizplay.co.in',
      ];

      const envOrigins = (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const allowedOrigins = new Set([...defaultAllowedOrigins, ...envOrigins]);

      const allowVercel = (process.env.CORS_ALLOW_VERCEL_APP ?? 'true')
        .trim()
        .toLowerCase() !== 'false';
      const isVercelAppOrigin =
        typeof origin === 'string' &&
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

      if (!origin || allowedOrigins.has(origin) || (allowVercel && isVercelAppOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Origin'],
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
