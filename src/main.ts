import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:4200', // Angular app
    credentials: true,               // if using cookies / auth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // remove extra fields
      forbidNonWhitelisted: true,
      transform: true,          // auto-transform payloads
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();


