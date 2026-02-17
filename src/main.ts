import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as express from 'express';


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
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost',
        'https://localhost',       // 👈 ADDED (Android Capacitor default)
        'capacitor://localhost',
        'http://localhost:8100',
        'http://192.168.31.179:3000',
        'https://quizplay.co.in',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
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
