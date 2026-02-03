import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    // ENV (still useful for other vars)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB (hardcoded for testing)
    MongooseModule.forRoot(
      'mongodb+srv://jaisuryakataria:KVYUD8HA2zQu9RF2@cluster0.592you1.mongodb.net/quizplay?retryWrites=true&w=majority',
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
      },
    ),

    AuthModule,
    UserModule,
    QuizModule,
    QuizPlayerModule,
    SubjectsModule,
    SubjectInfoModule,
    NotesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
