import {
  Controller,
  Post,
  UseGuards,
  Inject,
  forwardRef,
  Body,
  Get,
  Request,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { UserService } from '../../../user/user.service';
import { QuizService } from '../../../quiz/quiz.service';
import { RolesGuard } from '../../../auth/jwt/jwt/roles.guard';
import { Roles } from '../../../auth/role/roles.decorator';
import { Role } from '../../../auth/role/roles.enum';
import { JwtAuthGuard } from '../../../auth/jwt/jwt/jwt-auth.guard';
import { redis } from '../../../redis/redis.provider';

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

  @Get('users/search')
  async searchUsers(@Query('search') search?: string) {
    return this.userService.searchUsers(search);
  }

  @Get('users/inactive')
  async getInactiveUsers(@Query('search') search?: string) {
    return this.userService.getInactiveUsers(search);
  }

  @Post('clear-cache')
  async clearCache() {
    await redis.flushall();
    return { message: 'Redis cache flushed completely' };
  }

  @Post('assign-role')
  async assignRole(@Request() req, @Body() body: { userId: string, role: string }) {
    return this.userService.updateUserRole(
      body.userId,
      body.role,
      req.user?.sub,
      req.user?.email,
    );
  }

  @Patch('users/:userId/deactivate')
  async deactivateUser(@Param('userId') userId: string, @Request() req) {
    return this.userService.setUserActiveState(userId, false, req.user?.sub);
  }

  @Patch('users/:userId/activate')
  async activateUser(@Param('userId') userId: string, @Request() req) {
    return this.userService.setUserActiveState(userId, true, req.user?.sub);
  }
}
