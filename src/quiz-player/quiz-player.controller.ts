import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  Ip,
  Headers,
} from '@nestjs/common';
import type { Response } from 'express';
import { QuizPlayerService } from './quiz-player.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { QuizAccessGuard } from 'src/auth/jwt/jwt/quiz-access.guard';
import { GuestSessionService } from 'src/guest-session/guest-session.service';
import { GuestSessionGuard } from 'src/guest-session/guest-session.guard';

@Controller('quiz-player')
export class QuizPlayerController {
  constructor(
    private readonly service: QuizPlayerService,
    private readonly guestSessionService: GuestSessionService,
  ) {}

  // 🎯 Get quiz for playing (NO answers - authenticated)
  @UseGuards(JwtAuthGuard, QuizAccessGuard)
  @Get(':quizId')
  async getQuiz(@Param('quizId') quizId: string) {
    return this.service.getPlayableQuiz(quizId);
  }

  // 🎯 Get quiz for playing (NO answers - guest)
  @Get(':quizId/public')
  async getQuizPublic(@Param('quizId') quizId: string) {
    // Note: We might want a public version of QuizAccessGuard eventually 
    // but for now we'll allow public access to the playable quiz data.
    return this.service.getPlayableQuiz(quizId);
  }

  // 📝 Start attempt
  @UseGuards(JwtAuthGuard, QuizAccessGuard)
  @Post(':quizId/start')
  async startQuiz(
    @Param('quizId') quizId: string,
    @Body('userId') userId: string,
  ) {
    return this.service.startAttempt(quizId, userId);
  }

  // 📝 Start attempt public (with guest session)
  @Post(':quizId/start/public')
  async startQuizPublic(
    @Param('quizId') quizId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 🔐 Generate fingerprint from IP + User-Agent
    const fingerprint = this.guestSessionService.generateFingerprint(
      ip,
      userAgent || 'unknown',
    );

    // 🆕 Create or get existing guest session
    const guestSession = await this.guestSessionService.createOrGetSession(
      fingerprint,
    );

    // ⏱️ Check rate limits
    await this.guestSessionService.checkGlobalLimit(guestSession._id.toString());
    await this.guestSessionService.checkRateLimit(guestSession._id.toString());

    // 📈 Increment global counter
    await this.guestSessionService.incrementTotalQuizzes(guestSession._id.toString());

    // 🍪 Set HTTP-only cookie (secure, 24h expiry)
    res.cookie('guest_session', guestSession.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // 🎯 Start quiz attempt with guest session
    return this.service.startAttemptGuest(quizId, guestSession._id.toString());
  }

  // 💾 Save answer (guest - protected by cookie)
  @UseGuards(GuestSessionGuard)
  @Post('answer/public')
  async saveAnswerPublic(
    @Body()
    body: {
      attemptId: string;
      questionId: string;
      selectedOptionIndex: number | null;
    },
    @Req() req: any,
  ) {
    // Validate attempt belongs to this guest session
    return this.service.saveAnswer(body, req.guestSession._id.toString());
  }

  // 💾 Save answer (authenticated users)
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

  // 🚀 Submit quiz (guest - protected by cookie)
  @UseGuards(GuestSessionGuard)
  @Post(':attemptId/submit/public')
  async submitPublic(
    @Param('attemptId') attemptId: string,
    @Req() req: any,
  ) {
    return this.service.submitQuiz(attemptId, req.guestSession._id.toString());
  }

  // 🚀 Submit quiz (authenticated users)
  @Post(':attemptId/submit')
  async submit(@Param('attemptId') attemptId: string) {
    return this.service.submitQuiz(attemptId);
  }

  // 📊 Get quiz result (guest - protected by cookie)
  @UseGuards(GuestSessionGuard)
  @Get('result/:attemptId/public')
  async getResultPublic(
    @Param('attemptId') attemptId: string,
    @Req() req: any,
  ) {
    return this.service.getQuizResult(attemptId, req.guestSession._id.toString());
  }

  // 📊 Get quiz result (authenticated users)
  @UseGuards(JwtAuthGuard)
  @Get('result/:attemptId')
  async getResult(
    @Param('attemptId') attemptId: string,
  ) {
    return this.service.getQuizResult(attemptId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attempted/count')
  async getAttemptedQuizzes(@Req() req: any) {
    return this.service.getAttemptedQuizzesCount(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('teacher/submissions')
  async getTeacherSubmissions(@Req() req: any) {
    const teacherId = req.user.sub;
    return this.service.getTeacherSubmissions(teacherId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('teacher/stats')
  async getTeacherStats(@Req() req: any) {
    const teacherId = req.user.sub;
    const batchIds = req.user.batchIds || [];
    return this.service.getTeacherStats(teacherId, batchIds);
  }
}
