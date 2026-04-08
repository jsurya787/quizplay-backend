import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

const expressApp = express();
let cachedServer: any;

async function bootstrapServer() {
  if (!cachedServer) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    // Apply exact same middleware as src/main.ts
    app.use(cookieParser());

    app.use((req, res, next) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'"); 
      res.setHeader('X-Powered-By', 'QuizPlay Engine'); 
      next();
    });

    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:4200',
          'http://localhost:8100',
          'http://localhost',
          'https://localhost',
          'capacitor://localhost',
          'ionic://localhost',
          'https://quizplay.co.in',
          'https://www.quizplay.co.in',
        ];

        if (!origin || allowedOrigins.includes(origin)) {
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

    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}
