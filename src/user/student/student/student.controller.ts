import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UserService } from '../../user.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/jwt/jwt/roles.guard';
import { Roles } from 'src/auth/role/roles.decorator';
import { Role } from 'src/auth/role/roles.enum';

@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly userService: UserService) {}

  @Get('teachers')
  @Roles(Role.STUDENT)
  async getAssignedTeachers(@Request() req) {
    return await this.userService.getStudentTeachers(req.user.sub);
  }
}
