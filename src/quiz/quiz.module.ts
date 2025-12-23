import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects/subjects/subjects.controller';
import { QuestionsController } from './questions/questions/questions.controller';
import { AttemptsController } from './attempts/attempts/attempts.controller';

@Module({
  controllers: [SubjectsController, QuestionsController, AttemptsController]
})
export class QuizModule {}
