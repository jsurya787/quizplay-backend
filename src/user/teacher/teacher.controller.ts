import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../user.service';
import { JwtAuthGuard } from '../../auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from '../../auth/jwt/jwt/roles.guard';
import { Roles } from '../../auth/role/roles.decorator';
import { Role } from '../../auth/role/roles.enum';
import { UpdateTeacherInstituteDto } from './dto/update-teacher-institute.dto';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherController {
  constructor(private readonly userService: UserService) {}

  /**
   * 🤝 Add a student to the teacher's list by email
   */
  @Post('students/add')
  @Roles(Role.TEACHER)
  async addStudent(@Request() req, @Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    try {
      return await this.userService.linkStudentByEmail(req.user.sub, email);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * 📋 Get list of students for the teacher
   */
  @Get('students')
  @Roles(Role.TEACHER)
  async getStudents(@Request() req, @Query('search') search?: string) {
    return await this.userService.getTeacherStudents(req.user.sub, search);
  }

  @Delete('students/:studentId')
  @Roles(Role.TEACHER)
  async removeStudent(@Request() req, @Param('studentId') studentId: string) {
    if (!studentId) {
      throw new BadRequestException('Student id is required');
    }

    try {
      return await this.userService.unlinkStudent(req.user.sub, studentId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Get('institute')
  @Roles(Role.TEACHER)
  async getInstitute(@Request() req) {
    return await this.userService.getTeacherInstitute(req.user.sub);
  }

  @Patch('institute')
  @Roles(Role.TEACHER)
  async updateInstitute(@Request() req, @Body() dto: UpdateTeacherInstituteDto) {
    return await this.userService.updateTeacherInstitute(req.user.sub, dto);
  }
}
