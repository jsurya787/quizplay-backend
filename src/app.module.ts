import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { QuizModule } from './quiz/quiz.module';
import { SubjectsModule } from './subjects/subjects.module';
import { ChaptersModule } from './chapters/chapters.module';

@Module({
  imports: [
    // Global ENV
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),

    AuthModule,
    UserModule,
    QuizModule,
    SubjectsModule,
    ChaptersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
