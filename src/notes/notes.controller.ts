import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt/jwt-auth.guard';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateNoteDto) {
    return this.notesService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req, @Query('search') search?: string) {
    return this.notesService.findAll(req.user.sub, search);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.notesService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.notesService.delete(id, req.user.sub);
  }
}
