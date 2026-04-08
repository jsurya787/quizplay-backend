import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

/* ===== SUBJECT INFO ===== */
import {
  SubjectInfo,
  SubjectInfoSchema,
} from './subject-info.schema';
import { SubjectInfoService } from './subject-info.service';
import { SubjectInfoController } from './subject-info.controller';

/* ===== CHAPTER ===== */
import {
  Chapter,
  ChapterSchema,
} from './chapter.schema';
import { ChapterService } from './chapter.service';
import { ChapterController } from './chapter.controller';
import { Quiz, QuizSchema } from '../quiz/quiz.schema';
import { Subject, SubjectSchema } from '../subjects/subject.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {  
        name: Subject.name, 
        schema: SubjectSchema 
      }, 
      {
        name: SubjectInfo.name,
        schema: SubjectInfoSchema,
      },

      {
        name: Chapter.name,
        schema: ChapterSchema, 
      },
     {  
        name: Quiz.name, 
        schema: QuizSchema 
     }, 
    ]),
  ],
  controllers: [
    SubjectInfoController,
    ChapterController,
  ],
  providers: [
    SubjectInfoService,
    ChapterService,
  ],
  exports: [
    SubjectInfoService,
    ChapterService, // 🔥 reusable later
  ],
})
export class SubjectInfoModule {}
