import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ChaptersService } from './chapters.service';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

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
