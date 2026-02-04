import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizSchema, Quiz } from './quiz.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
    ]), UserModule
  ],
  controllers: [QuizController],
  providers: [QuizService, UserService],
  exports: [QuizService],
  })
export class QuizModule {}
