import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChapterSection,
  ChapterSectionSchema,
} from './chapter-section.schema';
import { ChapterSectionsService } from './chapter-section.service';
import { ChapterSectionsController } from './chapter-section.controller';
import { ChaptersModule } from '../chapters/chapters.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChapterSection.name, schema: ChapterSectionSchema },
    ]),
    ChaptersModule,
  ],
  controllers: [ChapterSectionsController],
  providers: [ChapterSectionsService],
})
export class ChapterSectionsModule {}
