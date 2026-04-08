import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Get,
  Query,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './create-quiz.dto';
import { AddQuestionDto } from './add-question.dto';
import { NotifyStudentsDto } from './notify-students.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt/jwt-auth.guard';
import { QuizAccessGuard } from '../auth/jwt/jwt/quiz-access.guard';
import { RolesGuard } from '../auth/jwt/jwt/roles.guard';
import { Roles } from '../auth/role/roles.decorator';
import { Role } from '../auth/role/roles.enum';
import { OptionalJwtAuthGuard } from '../auth/jwt/jwt/optional-jwt-auth.guard';

//@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // 📄 GET /quizzes?limit=10&skip=0 
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('search') search?: string,
    @Query('subjectId') subjectId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('createdByMe') createdByMe?: string,
    @Query('teacherQuizzesOnly') teacherQuizzesOnly?: string,
    @Req() req?: any,
  ) {
    return {
      success: true,
      ...(await this.quizService.findAll(
        limit ? Number(limit) : undefined,
        skip ? Number(skip) : undefined,
        search,
        subjectId,
        difficulty,
        createdByMe,
        teacherQuizzesOnly === 'true',
        req?.user?.sub,
      )),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('createdByUser')
  async getCreatedQuizzes(@Req() req: any) {
    const userId = req.user.sub;
    return this.quizService.getCreatedQuizzes(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('createdByUser/list')
  async getCreatedQuizzesList(@Req() req: any) {
    const userId = req.user.sub;
    return this.quizService.getCreatedQuizzesList(userId);
  }

  // restricted access only by specfic user
  @UseGuards(JwtAuthGuard, QuizAccessGuard)
  @Get(':quizId') 
  getQuiz(@Param('quizId') quizId: string) {
    return this.quizService.getQuizById(quizId);
  }

  // 🟡 Create Draft Quiz
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(@Body() dto: CreateQuizDto, @Req() req: any) {
    const userId = req.user.sub;
    const quiz = await this.quizService.createDraft(dto, userId, req.user.role);
    return {
      success: true,
      message: 'Quiz draft created',
      data: quiz,
    };
  }

  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/public')
  async createPublic(@Body() dto: CreateQuizDto, @Req() req: any) {
    const userId = req.user.sub;
    const userRole = req.user.role;
    const quiz = await this.quizService.createDraft(dto, userId, userRole);
    return {
      success: true,
      message: 'Quiz draft created',
      data: quiz,
    };
  }

  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':quizId/public')
  async updatePublic(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuizDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    const quiz = await this.quizService.updateDraft(quizId, dto, userId, req.user.role);
    return {
      success: true,
      message: 'Quiz draft updated',
      data: quiz,
    };
  }

  // 🗑️ Delete Quiz
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':quizId')
  async deleteQuiz(@Param('quizId') quizId: string, @Req() req: any) {
    await this.quizService.deleteQuiz(quizId, req.user.sub, req.user.role);
    return {
      success: true,
      message: 'Quiz removed successfully',
    };
  }

  // 🟡 Add / Save Question
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':quizId/questions')
  async addQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: AddQuestionDto,
    @Req() req: any,
  ) {
    const quiz = await this.quizService.addQuestion(
      quizId,
      dto,
      req.user.sub,
      req.user.role,
    );
    return {
      success: true,
      message: 'Question added successfully',
      data: quiz,
    };
  }

  // 🟡 Add Multiple questions  / Save Question
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':quizId/questions/bulk')
  async addBulkQuestions(
    @Param('quizId') quizId: string,
    @Body() dto: AddQuestionDto[],
    @Req() req: any,
  ) {
    const quiz = await this.quizService.addBulkQuestions(
      quizId,
      dto,
      req.user.sub,
      req.user.role,
    );
    return {
      success: true,
      message: 'All Question added successfully',
      data: quiz,
    };
  }

  // Update Question
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':quizId/questions/:questionId')
  async updateQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() dto: AddQuestionDto,
    @Req() req: any,
  ) {
    const quiz = await this.quizService.updateQuestion(
      quizId,
      questionId,
      dto,
      req.user.sub,
      req.user.role,
    );

    return {
      success: true,
      message: 'Question updated successfully',
      data: quiz,
    };
  }

  // 🗑️ Delete Question
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':quizId/questions/:questionId')
  async removeQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Req() req: any,
  ) {
    const quiz = await this.quizService.removeQuestion(
      quizId,
      questionId,
      req.user.sub,
      req.user.role,
    );
    return {
      success: true,
      message: 'Question removed successfully',
      data: quiz,
    };
  }

  // 🚀 Publish Quiz
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':quizId/publish')
  async publish(@Param('quizId') quizId: string, @Req() req: any) {
    const quiz = await this.quizService.publishQuiz(
      quizId,
      req.user.sub,
      req.user.role,
    );
    return {
      success: true,
      message: 'Quiz published successfully',
      data: quiz,
    };
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':quizId/notify-students')
  async notifyStudents(
    @Param('quizId') quizId: string,
    @Body() body: NotifyStudentsDto,
    @Req() req: any,
  ) {
    const result = await this.quizService.notifyStudentsForPublishedQuiz(
      quizId,
      req.user.sub,
      req.user.role,
      body.sendToAll === true,
    );
    return {
      success: true,
      message: result.message,
      data: result.notification,
    };
  }



  @Roles(Role.ADMIN, Role.TEACHER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':quizId/assign-batches')
  assignBatches(
    @Param('quizId') quizId: string,
    @Body() body: { batchIds: string[] },
    @Req() req: any,
  ) {
    return this.quizService.assignBatches(
      quizId,
      body.batchIds,
      req.user.sub,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':quizId/assign-users')
  assignUsers(
    @Param('quizId') quizId: string,
    @Body() body: { userIds: string[] },
    @Req() req: any,
  ) {
    return this.quizService.assignUsers(quizId, body.userIds, req.user.sub, req.user.role);
  }
}
