import { Controller, Post, UseGuards, Inject, forwardRef, Body } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { QuizService } from 'src/quiz/quiz.service';
import { RolesGuard } from 'src/auth/jwt/jwt/roles.guard';
import { Roles } from 'src/auth/role/roles.decorator';
import { Role } from 'src/auth/role/roles.enum';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { redis } from 'src/redis/redis.provider';
import { Get } from '@nestjs/common';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => QuizService))
    private readonly quizService: QuizService,
  ) {}

  @Post('sync-all-cache')
  async syncAll() {
    const userResult = await this.userService.syncAllUserRelations();
    const quizResult = await this.quizService.syncAllQuizCache();

    return {
      message: 'Redis cache rebuild complete',
      usersSynced: userResult.count,
      quizzesSynced: quizResult.count,
    };
  }

  @Get('stats')
  async getStats() {
    return this.userService.getAdminStats();
  }

  @Get('teachers')
  async getTeachers() {
    return this.userService.getTeachersList();
  }

  @Get('students')
  async getStudents() {
    return this.userService.getStudentsList();
  }

  @Post('clear-cache')
  async clearCache() {
    await redis.flushall();
    return { message: 'Redis cache flushed completely' };
  }

  @Post('assign-role')
  async assignRole(@Body() body: { userId: string, role: string }) {
    return this.userService.updateUserRole(body.userId, body.role);
  }
}
