import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Quiz } from '../quiz/quiz.schema';
import { QuizSchema } from '../quiz/quiz.schema';

import { QuizAttempt } from './quiz-attempt.schema';
import { QuizAttemptSchema } from './quiz-attempt.schema';

import { QuizPlayerController } from './quiz-player.controller';
import { QuizPlayerService } from './quiz-player.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizAttempt.name, schema: QuizAttemptSchema },
    ]),
  ],
  controllers: [QuizPlayerController],
  providers: [QuizPlayerService],
  exports: [QuizPlayerService],
})
export class QuizPlayerModule {}
