import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SubjectInfoService } from './subject-info.service';
import { CreateSubjectInfoDto } from './dto/create-subject-info.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/jwt/jwt/roles.guard';
import { Role } from 'src/auth/role/roles.enum';
import { Roles } from 'src/auth/role/roles.decorator';

@Controller('subject-info')
export class SubjectInfoController {
  constructor(private service: SubjectInfoService) {}
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
