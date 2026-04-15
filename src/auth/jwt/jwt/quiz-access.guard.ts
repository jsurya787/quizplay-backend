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
import { User, UserDocument } from 'src/user/schemas/user.schema';

@Injectable()
export class QuizAccessGuard implements CanActivate {
  constructor(
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly userService: UserService,
    private readonly quizService: QuizService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.sub;
    const quizId = req.params.quizId;

    if (!quizId) return true;

    // Prefer Redis (fast path), but treat it as a cache and fall back to Mongo.
    // This also allows unauthenticated access for PUBLIC quizzes when paired
    // with an optional JWT guard.
    let meta:
      | { visibility?: string; createdBy?: string }
      | undefined;

    try {
      meta = await redis.hgetall(`quiz:${quizId}:meta`);

      // ❗ Cache miss: warm quiz cache
      if (!meta || !meta.visibility) {
        try {
          await this.quizService.syncQuizCache(quizId);
        } catch {
          // ignore; we'll fall back to DB below
        }
        meta = await redis.hgetall(`quiz:${quizId}:meta`);
      }
    } catch {
      meta = undefined;
    }

    // ✅ Rule 1: Public access
    if (meta?.visibility === 'PUBLIC') return true;

    // If we still don't have metadata, fall back to Mongo for enforcement.
    if (!meta?.visibility || !meta?.createdBy) {
      if (!Types.ObjectId.isValid(quizId)) return false;

      const quiz = await this.quizModel
        .findById(quizId)
        .select('visibility createdBy allowedBatchIds allowedUserIds')
        .lean();
      if (!quiz) return false;

      if (quiz.visibility === 'PUBLIC') return true;
      if (!userId) return false;
      if (quiz.createdBy.toString() === userId) return true;

      // Strict mode: explicitly assigned users
      if (quiz.allowedUserIds && quiz.allowedUserIds.length > 0) {
        return quiz.allowedUserIds.some((id) => id.toString() === userId);
      }

      const user = await this.userModel
        .findById(userId)
        .select('teachers batchIds')
        .lean();
      if (!user) return false;

      const isTeacherOfStudent = (user.teachers || []).some(
        (t) => t.toString() === quiz.createdBy.toString(),
      );
      if (isTeacherOfStudent) return true;

      const allowedBatchIds = (quiz.allowedBatchIds || []).map((b) =>
        b.toString(),
      );
      if (allowedBatchIds.length === 0) return false;

      const userBatchIds = (user.batchIds || []).map((b) => b.toString());
      return userBatchIds.some((b) => allowedBatchIds.includes(b));
    }

    // From here: we have meta from Redis.
    if (!userId) return false;

    // ✅ Rule 2: Ownership
    if (meta.createdBy === userId) return true;

    // 2️⃣ Explicit assigned-user check (strict mode)
    try {
      const hasAssignedUsers = await redis.exists(`quiz:${quizId}:users`);
      if (hasAssignedUsers) {
        const isAssigned = await redis.sismember(
          `quiz:${quizId}:users`,
          userId,
        );
        return Boolean(isAssigned);
      }
    } catch {
      // If Redis is unavailable, fall back to Mongo strict-mode check.
      if (!Types.ObjectId.isValid(quizId)) return false;
      const quiz = await this.quizModel
        .findById(quizId)
        .select('allowedUserIds')
        .lean();
      if (!quiz) return false;
      if (quiz.allowedUserIds && quiz.allowedUserIds.length > 0) {
        return quiz.allowedUserIds.some((id) => id.toString() === userId);
      }
    }

    // 3️⃣ Relation checks (Teacher-Student & Batches)
    try {
      const hasTeachers = await redis.exists(`user:${userId}:teachers`);
      const hasBatches = await redis.exists(`user:${userId}:batches`);

      if (!hasTeachers || !hasBatches) {
        await this.userService.syncUserRelations(userId);
      }

      const isTeacherOfStudent = await redis.sismember(
        `user:${userId}:teachers`,
        meta.createdBy,
      );
      if (isTeacherOfStudent) return true;

      const userBatchIds = await redis.smembers(`user:${userId}:batches`);
      for (const batchId of userBatchIds) {
        const allowed = await redis.sismember(
          `quiz:${quizId}:batches`,
          batchId,
        );
        if (allowed) return true;
      }

      return false;
    } catch {
      // Redis failed; fall back to Mongo for relations/batches.
      if (!Types.ObjectId.isValid(quizId)) return false;
      const quiz = await this.quizModel
        .findById(quizId)
        .select('createdBy allowedBatchIds allowedUserIds visibility')
        .lean();
      if (!quiz) return false;

      if (quiz.visibility === 'PUBLIC') return true;
      if (quiz.createdBy.toString() === userId) return true;

      if (quiz.allowedUserIds && quiz.allowedUserIds.length > 0) {
        return quiz.allowedUserIds.some((id) => id.toString() === userId);
      }

      const user = await this.userModel
        .findById(userId)
        .select('teachers batchIds')
        .lean();
      if (!user) return false;

      const isTeacherOfStudent = (user.teachers || []).some(
        (t) => t.toString() === quiz.createdBy.toString(),
      );
      if (isTeacherOfStudent) return true;

      const allowedBatchIds = (quiz.allowedBatchIds || []).map((b) =>
        b.toString(),
      );
      if (allowedBatchIds.length === 0) return false;

      const userBatchIds = (user.batchIds || []).map((b) => b.toString());
      return userBatchIds.some((b) => allowedBatchIds.includes(b));
    }
  }
}
