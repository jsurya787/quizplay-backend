import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';

import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/jwt/jwt/roles.guard';
import { Role } from 'src/auth/role/roles.enum';
import { Roles } from 'src/auth/role/roles.decorator';

import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  // ➕ Create Subject
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() body: CreateSubjectDto) {
    return this.subjectsService.create(body);
  }

  // 📄 Get All Subjects
  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }

  // 📄 Get Primary Subjects
  @Get('primary')
  findPrimarySubjects() {
    return this.subjectsService.findPrimarySubjects();
  }

  // ✏️ Update Subject
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(id, body);
  }

  // 🗑️ Delete Subject
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
