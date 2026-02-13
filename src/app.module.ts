import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { QuizModule } from './quiz/quiz.module';
import { SubjectsModule } from './subjects/subjects.module';
import { QuizPlayerModule } from './quiz-player/quiz-player.module';
import { SubjectInfoModule } from './subject-infos/subject-info.module';
import { NotesModule } from './notes/notes.module';
import { GuestSessionModule } from './guest-session/guest-session.module';

@Module({
  imports: [
    // ENV (still useful for other vars)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB (Environment Based)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    UserModule,
    QuizModule,
    QuizPlayerModule,
    SubjectsModule,
    SubjectInfoModule,
    NotesModule,
    GuestSessionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
