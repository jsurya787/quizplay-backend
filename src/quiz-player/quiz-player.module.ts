import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Quiz, QuizSchema } from '../quiz/quiz.schema';
import { QuizAttempt, QuizAttemptSchema } from './quiz-attempt.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

import { QuizPlayerController } from './quiz-player.controller';
import { QuizPlayerService } from './quiz-player.service';
import { GuestSessionModule } from '../guest-session/guest-session.module';
import { UserModule } from '../user/user.module';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },          // ✅ REQUIRED
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizAttempt.name, schema: QuizAttemptSchema },
    ]),
    GuestSessionModule, 
    UserModule,
    QuizModule,
  ],
  controllers: [QuizPlayerController],
  providers: [QuizPlayerService],
  exports: [QuizPlayerService],
})
export class QuizPlayerModule {}
