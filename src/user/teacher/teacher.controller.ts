import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../user.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/jwt/jwt/roles.guard';
import { Roles } from 'src/auth/role/roles.decorator';
import { Role } from 'src/auth/role/roles.enum';

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
  async getStudents(@Request() req) {
    return await this.userService.getTeacherStudents(req.user.sub);
  }
}
