import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Get,
  Query,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './create-quiz.dto';
import { AddQuestionDto } from './add-question.dto';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}


  // 📄 GET /quizzes?limit=10&skip=0
  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.quizService.findAll(
      limit ? Number(limit) : undefined,
      skip ? Number(skip) : undefined,
    );

    return {
      success: true,
      message: 'Quizzes fetched successfully',
      ...result,
    };
  }


  // 🟡 Create Draft Quiz
  @Post()
  async create(@Body() dto: CreateQuizDto) {
    const quiz = await this.quizService.createDraft(dto);
    return {
      success: true,
      message: 'Quiz draft created',
      data: quiz,
    };
  }

  // 🟡 Add / Save Question
  @Post(':quizId/questions')
  async addQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: AddQuestionDto,
  ) {
    const quiz = await this.quizService.addQuestion(quizId, dto);
    return {
      success: true,
      message: 'Question added successfully',
      data: quiz,
    };
  }

  // 🗑️ Delete Question
  @Delete(':quizId/questions/:questionId')
  async removeQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    const quiz = await this.quizService.removeQuestion(quizId, questionId);
    return {
      success: true,
      message: 'Question removed successfully',
      data: quiz,
    };
  }

  // 🚀 Publish Quiz
  @Post(':quizId/publish')
  async publish(@Param('quizId') quizId: string) {
    const quiz = await this.quizService.publishQuiz(quizId);
    return {
      success: true,
      message: 'Quiz published successfully',
      data: quiz,
    };
  }
}
