// quiz-access.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from 'src/quiz/quiz.schema';
import { redis } from 'src/redis/redis.provider';
import { UserService } from 'src/user/user.service';
import { QuizService } from 'src/quiz/quiz.service';

@Injectable()
export class QuizAccessGuard implements CanActivate {
  constructor(
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    private readonly userService: UserService,
    private readonly quizService: QuizService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user.sub;
    const quizId = req.params.quizId;

    if (!quizId) return true;

    // 1️⃣ Get Quiz Metadata from Redis
    let quizMeta = await redis.hgetall(`quiz:${quizId}:meta`);
    
    // ❗ Cache Miss: Warm Quiz Cache
    if (!quizMeta || !quizMeta.visibility) {
      await this.quizService.syncQuizCache(quizId);
      quizMeta = await redis.hgetall(`quiz:${quizId}:meta`);
    }

    if (!quizMeta || !quizMeta.visibility) return false;

    // ✅ Rule 1: Public access
    if (quizMeta.visibility === 'PUBLIC') return true;

    // ✅ Rule 2: Ownership
    if (quizMeta.createdBy === userId) return true;

    // 2️⃣ Relation Checks (Teacher-Student & Batches)
    // First, ensure user relationships are in Redis
    const hasTeachers = await redis.exists(`user:${userId}:teachers`);
    const hasBatches = await redis.exists(`user:${userId}:batches`);

    if (!hasTeachers || !hasBatches) {
      await this.userService.syncUserRelations(userId);
    }

    // ✅ Rule 3: Teacher Relationship
    const isTeacherOfStudent = await redis.sismember(`user:${userId}:teachers`, quizMeta.createdBy);
    if (isTeacherOfStudent) return true;

    // ✅ Rule 4: Batch Access
    const userBatchIds = await redis.smembers(`user:${userId}:batches`);
    if (userBatchIds.length > 0) {
      // Check if any of user's batches are allowed for this quiz
      for (const bId of userBatchIds) {
        const allowed = await redis.sismember(`quiz:${quizId}:batches`, bId);
        if (allowed) return true;
      }
    }

    return false;
  }
}

