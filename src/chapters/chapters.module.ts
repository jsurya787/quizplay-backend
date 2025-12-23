import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { Chapter, ChapterSchema } from './chapter.schema';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chapter.name, schema: ChapterSchema },
    ]),
    SubjectsModule,
  ],
  controllers: [ChaptersController],
  providers: [ChaptersService],
})
export class ChaptersModule {}
