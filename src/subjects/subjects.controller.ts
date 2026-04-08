import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt/roles.guard';
import { SubjectsService } from './subjects.service';
import { Role } from '../auth/role/roles.enum';
import { Roles } from '../auth/role/roles.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ListSubjectsDto } from './dto/list-subjects.dto';

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

  // ➕ CREATE SUBJECT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() body: CreateSubjectDto) {
    return this.subjectsService.create(body);
  }

  // 📄 Get All Subjects
  @Get()
  findAll(@Query() query: ListSubjectsDto) {
    return this.subjectsService.findAll(query);
  }

  // 📄 Get Primary Subjects
  @Get('primary')
  findPrimarySubjects() {
    return this.subjectsService.findPrimarySubjects();
  }

  // ✏️ UPDATE SUBJECT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateSubjectDto) {
    return this.subjectsService.update(id, body);
  }

  // 🗑️ DELETE SUBJECT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
