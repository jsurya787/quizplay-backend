import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import { ChapterService } from './chapter.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@Controller('chapters')
export class ChapterController {
  constructor(private service: ChapterService) {}

@Get(':chapterId')
  getChapter(@Param('chapterId') chapterId: string) {
    return this.service.findByChapter(chapterId);
  }

  @Post()
  create(@Body() dto: CreateChapterDto) {
    return this.service.create(dto);
  }

  @Get('subject/:subjectId')
  findBySubject(@Param('subjectId') subjectId: string) {
    return this.service.findBySubject(subjectId);
  }

  @Delete(':chapterId')
  remove(@Param('chapterId') chapterId: string) {
    return this.service.delete(chapterId);
  }

  @Put(':chapterId')
  async updateChapter(
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.service.updateChapter(chapterId, dto);
  }



@Post(':chapterId/sections')
addSection(
  @Param('chapterId') chapterId: string,
  @Body() dto: CreateSectionDto,
) {
  return this.service.addSectionToChapter(chapterId, dto);
}

@Put(':chapterId/sections/:sectionId')
updateSection(
  @Param('chapterId') chapterId: string,
  @Param('sectionId') sectionId: string,
  @Body() dto: CreateSectionDto,
) {
  return this.service.updateSectionToChapter(
    chapterId,
    sectionId,
    dto,
  );
}

@Delete(':chapterId/sections/:sectionId')
deleteSection(
  @Param('chapterId') chapterId: string,
  @Param('sectionId') sectionId: string,
) {
  return this.service.deleteSectionFromChapter(
    chapterId,
    sectionId,
  );
}


}
