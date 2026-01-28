import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ChapterService } from './chapter.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/jwt/jwt/roles.guard';
import { Role } from 'src/auth/role/roles.enum';
import { Roles } from 'src/auth/role/roles.decorator';

@Controller('chapters')
export class ChapterController {
  constructor(private service: ChapterService) {}

@Get(':chapterId')
  getChapter(@Param('chapterId') chapterId: string) {
    return this.service.findByChapter(chapterId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateChapterDto) {
    return this.service.create(dto);
  }

  @Get('subject/:subjectId')
  findBySubject(@Param('subjectId') subjectId: string) {
    return this.service.findBySubject(subjectId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':chapterId')
  remove(@Param('chapterId') chapterId: string) {
    return this.service.delete(chapterId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':chapterId')
  async updateChapter(
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.service.updateChapter(chapterId, dto);
  }


@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Post(':chapterId/sections')
addSection(
  @Param('chapterId') chapterId: string,
  @Body() dto: CreateSectionDto,
) {
  return this.service.addSectionToChapter(chapterId, dto);
}
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
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
