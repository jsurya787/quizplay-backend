import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { JwtAuthGuard } from '../auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt/roles.guard';
import { Roles } from '../auth/role/roles.decorator';
import { Role } from '../auth/role/roles.enum';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() body: any) {
    return this.chaptersService.create(body);
  }

  @Get('subject/:subjectId')
  findBySubject(@Param('subjectId') subjectId: string) {
    return this.chaptersService.findBySubject(subjectId);
  }

 @Get()
  findAll() { 
    return this.chaptersService.findAll();
  }
}
