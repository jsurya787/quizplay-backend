import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { QuizPlayerService } from './quiz-player.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';

@Controller('quiz-player')
export class QuizPlayerController {
  constructor(private readonly service: QuizPlayerService) {}

  // 🎯 Get quiz for playing (NO answers)
  @Get(':quizId')
  async getQuiz(@Param('quizId') quizId: string) {
    return this.service.getPlayableQuiz(quizId);
  }

  // 📝 Start attempt
  @Post(':quizId/start')
  async startQuiz(
    @Param('quizId') quizId: string,
    @Body('userId') userId: string,
  ) {
    return this.service.startAttempt(quizId, userId);
  }

  // 💾 Save answer
  @Post('answer')
  async saveAnswer(
    @Body()
    body: {
      attemptId: string;
      questionId: string;
      selectedOptionIndex: number | null;
    },
  ) {
    return this.service.saveAnswer(body);
  }

  // 🚀 Submit quiz
  @Post(':attemptId/submit')
  async submit(@Param('attemptId') attemptId: string) {
    return this.service.submitQuiz(attemptId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attempted/count')
  async getAttemptedQuizzes(@Req() req: any) {
    return this.service.getAttemptedQuizzesCount(req.user.sub);
  }
}
