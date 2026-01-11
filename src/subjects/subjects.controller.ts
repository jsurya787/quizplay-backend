import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  // ➕ Create Subject
  @Post()
  async create(@Body() body: any) {
    try {
      const subject = await this.subjectsService.create(body);

      return {
        success: true,
        message: 'Subject created successfully',
        data: subject,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to create subject',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 📄 Get All Subjects
  @Get()
  async findAll() {
    try {
      const subjects = await this.subjectsService.findAll();

      return {
        success: true,
        message: 'Subjects fetched successfully',
        data: subjects,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch subjects',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✏️ Update Subject
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    try {
      const updatedSubject = await this.subjectsService.update(id, body);

      return {
        success: true,
        message: 'Subject updated successfully',
        data: updatedSubject,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to update subject',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🗑️ Delete Subject
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.subjectsService.remove(id);

      return {
        success: true,
        message: 'Subject deleted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to delete subject',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
