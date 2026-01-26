import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SubjectInfoService } from './subject-info.service';
import { CreateSubjectInfoDto } from './dto/create-subject-info.dto';

@Controller('subject-info')
export class SubjectInfoController {
  constructor(private service: SubjectInfoService) {}

  @Post()
  upsert(@Body() dto: CreateSubjectInfoDto) {
    return this.service.upsert(dto);
  }

  @Get(':subjectId')
  get(@Param('subjectId') subjectId: string) {
    return this.service.findBySubject(subjectId);
  }


  @Get(':subjectId/page')
  async getSubjectPage(@Param('subjectId') subjectId: string) {
    return this.service.getSubjectPage(subjectId);
  }
  
}
