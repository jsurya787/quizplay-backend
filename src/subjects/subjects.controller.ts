import { Controller, Get, Post, Body } from '@nestjs/common';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  create(@Body() body: any) {
    return this.subjectsService.create(body);
  }

  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }
}
