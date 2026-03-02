import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from './quiz.schema';
import { CreateQuizDto } from './create-quiz.dto';
import { AddQuestionDto } from './add-question.dto';
import { UserService } from 'src/user/user.service';
import { redis } from 'src/redis/redis.provider';
import { Role } from 'src/auth/role/roles.enum';

@Injectable()
export class QuizService {
  constructor(
    private readonly userService: UserService,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  private assertQuizOwnerOrAdmin(
    quiz: Pick<Quiz, 'createdBy'>,
    actorUserId: string,
    actorRole?: Role | string,
  ) {
    if (actorRole === Role.ADMIN) {
      return;
    }

    if (quiz.createdBy.toString() !== actorUserId) {
      throw new ForbiddenException('Not your quiz');
    }
  }

  // 📄 Get quizzes with limit (for quiz list page)
async findAll(
  limit?: number,
  skip?: number,
  search?: string,
  subjectId?: string,
  difficulty?: string,
  createdByMe?: string,
  teacherQuizzesOnly?: boolean,
  currentUserId?: string,
) {
  const safeLimit = limit && limit > 0 && limit <= 100 ? limit : 20;
  const safeSkip = skip && skip >= 0 ? skip : 0;

  const applyDefaultPublicScope = async () => {
    filter.visibility = 'PUBLIC';
    const admins = await this.userService.getListOfAdmins();

    if (!admins.length) {
      return false;
    }

    filter.createdBy = {
      $in: admins.map(id => new Types.ObjectId(id)),
    };
    return true;
  };

  const filter: any = {
    status: 'published',
  };

  // 🔍 SEARCH
  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  // 📚 SUBJECT
  if (subjectId) {
    filter.subjectId = subjectId;
  }

  // 🎯 DIFFICULTY
  if (difficulty) {
    filter.difficulty = difficulty;
  }

  // 👤 TEACHER QUIZZES ONLY (For Students)
  if (teacherQuizzesOnly) {
    if (!currentUserId) {
      const hasDefaultScope = await applyDefaultPublicScope();
      if (!hasDefaultScope) {
        return { total: 0, limit: safeLimit, skip: safeSkip, data: [] };
      }
    }

    if (currentUserId) {
      const user = await this.userService.findById(currentUserId);
      const teacherIds = (user?.teachers || []).map((id: any) => id.toString());

      if (teacherIds.length === 0) {
        const hasDefaultScope = await applyDefaultPublicScope();
        if (!hasDefaultScope) {
          return { total: 0, limit: safeLimit, skip: safeSkip, data: [] };
        }
      } else {
        filter.createdBy = {
          $in: teacherIds.map((id: string) => new Types.ObjectId(id)),
        };
        filter.$or = [
          { visibility: 'PUBLIC' },
          { allowedUserIds: new Types.ObjectId(currentUserId) },
        ];
      }

      // If no teachers, filter is already set to public default scope above.
    }
  } else if (createdByMe) {
    const ownerId = createdByMe === 'true' ? currentUserId : createdByMe;
    if (!ownerId || !Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid createdByMe user id');
    }
    // 👤 CREATED BY ME (overrides admin filter if present)
    filter.createdBy = new Types.ObjectId(ownerId);
  } else {
    const hasDefaultScope = await applyDefaultPublicScope();
    if (!hasDefaultScope) {
      return { total: 0, limit: safeLimit, skip: safeSkip, data: [] };
    }
  }

  const quizzes = await this.quizModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(safeSkip)
    .limit(safeLimit)
    .select(
      'title description subjectId difficulty timeLimit totalMarks questions createdAt status visibility'
    )
    .lean({ virtuals: true });

  const total = await this.quizModel.countDocuments(filter);

  return {
    total,
    limit: safeLimit,
    skip: safeSkip,
    data: quizzes.map(q => ({
      ...q,
      questionsCount: q.questions?.length || 0,
      questions: undefined,
    })),
  };
}

  async getQuizById(quizId: string) {
    return this.quizModel.findById(quizId);
  }




  // 🟡 Create Draft Quiz
  async createDraft(dto: CreateQuizDto, userId: string, role?: string) {
    if (role === Role.STUDENT) {
      const count = await this.quizModel.countDocuments({
        createdBy: new Types.ObjectId(userId),
      });

      if (count >= 5) {
        throw new BadRequestException('Students can only create up to 5 quizzes.');
      }
    }

    const visibility =
      role === Role.ADMIN
        ? 'PUBLIC'
        : role === Role.STUDENT
          ? 'RESTRICTED'
          : dto.visibility === 'PUBLIC'
            ? 'PUBLIC'
            : 'RESTRICTED';

    const quiz = await this.quizModel.create({
      title: dto.title,
      description: dto.description, // ✅ NEW
      subjectId: dto.subjectId,
      difficulty: dto.difficulty,
      timeLimit: dto.timeLimit,
      status: 'draft',
      questions: [],
      totalMarks: 0,
      visibility,
      createdBy: new Types.ObjectId(userId), // ✅ FIX
    });

    // Increment cached count in Redis
    const cacheKey = `user:${userId}:createdQuizzes`;
    const cachedCount = await redis.get(cacheKey);
    if (cachedCount !== null) {
      await redis.incr(cacheKey);
    }

    return quiz;
  }

  // 🟡 Update Draft Quiz
  async updateDraft(quizId: string, dto: CreateQuizDto, userId: string, role?: string) {
    const quiz = await this.quizModel.findOne({
      _id:  new Types.ObjectId(quizId),
      createdBy: new Types.ObjectId(userId),
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or not owned by user');
    }

    const updatePayload: Partial<CreateQuizDto> = {
      title: dto.title,
      description: dto.description,
      subjectId: dto.subjectId,
      difficulty: dto.difficulty,
      timeLimit: dto.timeLimit,
    };

    if (role === Role.ADMIN) {
      updatePayload.visibility = 'PUBLIC';
    } else if (role === Role.STUDENT) {
      updatePayload.visibility = 'RESTRICTED';
    } else if (role === Role.TEACHER && dto.visibility) {
      updatePayload.visibility = dto.visibility === 'PUBLIC' ? 'PUBLIC' : 'RESTRICTED';
    }

    Object.assign(quiz, updatePayload);
    return await quiz.save();
  }

  // delete quiz 
  async deleteQuiz(quizId: string, actorUserId: string, actorRole?: Role | string) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    this.assertQuizOwnerOrAdmin(quiz, actorUserId, actorRole);
    await quiz.deleteOne();

    // Decrement cached count in Redis
    const cacheKey = `user:${quiz.createdBy.toString()}:createdQuizzes`;
    const cachedCount = await redis.get(cacheKey);
    if (cachedCount !== null) {
      await redis.decr(cacheKey);
    }

    return { success: true };
  }


  // 🟡 Add Question
  async addQuestion(
    quizId: string,
    dto: AddQuestionDto,
    actorUserId: string,
    actorRole?: Role | string,
  ) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const correctOptions = dto.options.filter(o => o.isCorrect);
    if (correctOptions.length !== 1) {
      throw new BadRequestException('Exactly one correct option is required');
    }

    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    this.assertQuizOwnerOrAdmin(quiz, actorUserId, actorRole);
    if (quiz.status !== 'draft') {
      throw new BadRequestException('Quiz is already published');
    }

    quiz.questions.push(dto as any);
    quiz.totalMarks += dto.marks;

    await quiz.save();
    return quiz;
  }

  // Add Bulk Questions
  async addBulkQuestions(
    quizId: string,
    dtos: AddQuestionDto[],
    actorUserId: string,
    actorRole?: Role | string,
  ) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    this.assertQuizOwnerOrAdmin(quiz, actorUserId, actorRole);
    if (quiz.status !== 'draft') {
      throw new BadRequestException('Quiz is already published');
    }

    for (const dto of dtos) {
      const correctOptions = dto.options.filter(o => o.isCorrect);
      if (correctOptions.length !== 1) {
        throw new BadRequestException('Exactly one correct option is required for each question');
      }

      quiz.questions.push(dto as any);
      quiz.totalMarks += dto.marks;
    }

    await quiz.save();
    return quiz;
  }

  // 🟡 Update Question
  async updateQuestion(
    quizId: string,
    questionId: string, 
    dto: AddQuestionDto,
    actorUserId: string,
    actorRole?: Role | string,
  ) {
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundException('Quiz not found');
    this.assertQuizOwnerOrAdmin(quiz, actorUserId, actorRole);
    if (quiz.status !== 'draft') {
      throw new BadRequestException('Quiz is already published');
    }

    const index = quiz.questions.findIndex(
      q => q._id.toString() === questionId,
    );

    if (index === -1) {
      throw new NotFoundException('Question not found');
    }

    quiz.questions[index].questionText = dto.questionText;
    quiz.questions[index].marks = dto.marks;
    quiz.questions[index].options = dto.options;

    quiz.totalMarks = quiz.questions.reduce(
      (sum, q) => sum + q.marks,
      0,
    );

    await quiz.save();
    return quiz;
  }

  // 🗑️ Remove Question
  async removeQuestion(
    quizId: string,
    questionId: string,
    actorUserId: string,
    actorRole?: Role | string,
  ) {
    if (!Types.ObjectId.isValid(quizId) || !Types.ObjectId.isValid(questionId)) {
    throw new BadRequestException('Invalid id');
    }

    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    this.assertQuizOwnerOrAdmin(quiz, actorUserId, actorRole);
    if (quiz.status !== 'draft') {
      throw new BadRequestException('Quiz is already published');
    }

    const questionIndex = quiz.questions.findIndex(
    (q: any) => q._id.toString() === questionId,
    );

    if (questionIndex === -1) {
    throw new NotFoundException('Question not found');
    }

    const question = quiz.questions[questionIndex];
    quiz.totalMarks -= question.marks;

    quiz.questions.splice(questionIndex, 1);

    await quiz.save();
    return quiz;
  }


  // 🚀 Publish Quiz
  async publishQuiz(
    quizId: string,
    actorUserId: string,
    actorRole?: Role | string,
  ) {
    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    this.assertQuizOwnerOrAdmin(quiz, actorUserId, actorRole);

    if (quiz.questions.length === 0) {
      throw new BadRequestException('Add at least one question');
    }

    const creator = await this.userService.findById(quiz.createdBy.toString());
    if (
      creator?.role === 'TEACHER' &&
      quiz.visibility === 'RESTRICTED' &&
      (!quiz.allowedUserIds || quiz.allowedUserIds.length === 0)
    ) {
      throw new BadRequestException('Assign at least one student before publishing this quiz');
    }

    const wasDraft = quiz.status === 'draft';

    quiz.status = 'published';
    await quiz.save();

    // notify students whenever the quiz is (re)published.  if it's the first
    // publication we will end up contacting everyone; if it's a subsequent
    // publish/republish the notify method takes care of skipping students who
    // have already been emailed.
    try {
      await this.notifyStudentsForPublishedQuiz(quizId, actorUserId, actorRole || '');
    } catch (err) {
      // log error but do not prevent the publish call from returning
      console.error('failed to send quiz notifications during publish', err);
    }

    // 🚀 Warm Redis Cache
    await this.syncQuizCache(quizId);

    return { success: true, message: 'Quiz published successfully' };
  }

  async notifyStudentsForPublishedQuiz(
    quizId: string,
    actorUserId: string,
    actorRole: string,
    /**
     * When true notifications will be sent to every student regardless of
     * whether they have been emailed previously.  When false (the default)
     * the quiz record is consulted for `notifiedStudentIds` and only new
     * recipients are notified.
     */
    sendToAll = false,
  ) {
    const quiz = await this.quizModel
      .findById(quizId)
      .select(
        'title difficulty status createdBy allowedUserIds visibility notifiedStudentIds',
      )
      .lean();
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.status !== 'published') {
      throw new BadRequestException('Quiz must be published before sending notifications');
    }

    const isAdmin = actorRole === Role.ADMIN;
    const isTeacher = actorRole === Role.TEACHER;
    if (!isAdmin && !isTeacher) {
      throw new ForbiddenException('Only teachers or admins can send quiz notifications');
    }

    if (isTeacher && quiz.createdBy.toString() !== actorUserId) {
      throw new ForbiddenException('You can notify students only for your own quizzes');
    }

    // determine the base set of recipients based on visibility.  there are
    // two ways a teacher can restrict a quiz: explicit user selection or by
    // assigning batches.  we attempt to honour both; when both lists are
    // provided we treat the union as the allowed set.
    let targetStudentIds: string[] = [];
    if (quiz.visibility === 'RESTRICTED') {
      // users explicitly chosen
      if (quiz.allowedUserIds && quiz.allowedUserIds.length > 0) {
        targetStudentIds.push(...quiz.allowedUserIds.map((id: any) => id.toString()));
      }
      // students belonging to allowed batches
      if (quiz.allowedBatchIds && quiz.allowedBatchIds.length > 0) {
        const batchStudentIds = await this.userService.getActiveStudentIdsInBatches(
          quiz.allowedBatchIds.map((id: any) => id.toString()),
        );
        targetStudentIds.push(...batchStudentIds);
      }
      // dedupe
      targetStudentIds = Array.from(new Set(targetStudentIds));
    }

    if (!sendToAll) {
      const already = new Set(
        (quiz.notifiedStudentIds || []).map((id: any) => id.toString()),
      );
      targetStudentIds = targetStudentIds.filter((id) => !already.has(id));
    }

    if (quiz.visibility === 'RESTRICTED' && targetStudentIds.length === 0) {
      return {
        success: true,
        message: 'No assigned students for this quiz',
        notification: {
          success: true,
          totalRecipients: 0,
          sent: 0,
          failed: 0,
          message: 'No assigned student recipients found',
        },
      };
    }

    // NOTE: This is currently synchronous. If this endpoint becomes slow under higher volume,
    // move notification sending to RabbitMQ/Bull worker queue.
    const notification = await this.userService.notifyAssociatedStudentsAboutPublishedQuiz({
      teacherId: quiz.createdBy.toString(),
      quizTitle: quiz.title,
      difficulty: quiz.difficulty,
      studentIds: quiz.visibility === 'RESTRICTED' ? targetStudentIds : undefined,
    });

    // update quiz metadata so we know who has been contacted
    if (targetStudentIds.length > 0) {
      const uniqueIds = new Set(
        (quiz.notifiedStudentIds || []).map((id: any) => id.toString()),
      );
      targetStudentIds.forEach((id) => uniqueIds.add(id));

      await this.quizModel.updateOne(
        { _id: quizId },
        {
          notifiedStudentIds: Array.from(uniqueIds).map((id) => new Types.ObjectId(id)),
          lastNotifiedAt: new Date(),
        },
      );
    }

    return {
      success: true,
      message: 'Student notifications processed',
      notification,
    };
  }

  async getCreatedQuizzes(userId: string) {
    const cacheKey = `user:${userId}:createdQuizzes`;
    
    // Check Redis Cache First
    const cachedCount = await redis.get(cacheKey);
    if (cachedCount !== null) {
      return { success: true, data: parseInt(cachedCount, 10) };
    }

    // Fallback to DB
    const createdBy = new Types.ObjectId(userId);
    const count = await this.quizModel.countDocuments({ createdBy });

    // Store in cache for 1 hour
    await redis.set(cacheKey, count, 'EX', 3600);

    return {
      success: true,
      data: count,
    };
  }

  async getCreatedQuizzesList(userId: string) {
    const createdBy = new Types.ObjectId(userId);

    const quizzes = await this.quizModel
      .find({ createdBy })
      .sort({ createdAt: -1 })
      .select('title difficulty status createdAt totalMarks')
      .lean();

    return {
      success: true,
      data: quizzes,
    };
  }

  async assignBatches(
    quizId: string,
    batchIds: string[],
    teacherId: string,
    actorRole: Role,
  ) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const isAdmin = actorRole === Role.ADMIN;
    if (!isAdmin && quiz.createdBy.toString() !== teacherId) {
      throw new ForbiddenException('Not your quiz');
    }

    quiz.allowedBatchIds = batchIds.map(id => new Types.ObjectId(id));
    quiz.visibility = 'RESTRICTED';

    const associationTeacherId = isAdmin ? quiz.createdBy.toString() : teacherId;

    // if the quiz is already published we should notify any students who are
    // indirectly added via the newly assigned batches and haven't received an
    // email yet.
    if (quiz.status === 'published') {
      try {
        const previouslyNotified = new Set(
          (quiz.notifiedStudentIds || []).map((id: any) => id.toString()),
        );
        const allBatchStudentIds = await this.userService.getActiveStudentIdsInBatches(
          batchIds,
        );
        const newly = allBatchStudentIds.filter((id) => !previouslyNotified.has(id));
        if (newly.length > 0) {
          await this.userService.notifyAssociatedStudentsAboutPublishedQuiz({
            teacherId: associationTeacherId,
            quizTitle: quiz.title,
            difficulty: quiz.difficulty,
            studentIds: newly,
          });
          const unique = new Set(previouslyNotified);
          newly.forEach(id => unique.add(id));
          quiz.notifiedStudentIds = Array.from(unique).map(id => new Types.ObjectId(id));
          quiz.lastNotifiedAt = new Date();
        }
      } catch (err) {
        console.error('failed to notify newly assigned batches', err);
      }
    }

    await quiz.save();

    // 🔥 Redis warm-up
    await redis.del(`quiz:${quizId}:batches`);
    await redis.sadd(`quiz:${quizId}:batches`, ...batchIds);
    await redis.expire(`quiz:${quizId}:batches`, 3600);

    // 🚀 Warm Redis Cache
    await this.syncQuizCache(quizId);

    return { success: true, message: 'Quiz published successfully' };
  }

  async assignUsers(
    quizId: string,
    userIds: string[],
    teacherId: string,
    actorRole: Role,
  ) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const isAdmin = actorRole === Role.ADMIN;
    if (!isAdmin && quiz.createdBy.toString() !== teacherId) {
      throw new ForbiddenException('Not your quiz');
    }

    const sanitizedUserIds = Array.from(
      new Set((userIds || []).filter((id) => Types.ObjectId.isValid(id))),
    );

    if (sanitizedUserIds.length === 0) {
      throw new BadRequestException('Select at least one valid student');
    }

    const associationTeacherId = isAdmin ? quiz.createdBy.toString() : teacherId;
    const teacher = await this.userService.findById(associationTeacherId);
    const associatedStudentIds = new Set(
      (teacher?.students || []).map((id: any) => id.toString()),
    );

    const invalidIds = sanitizedUserIds.filter((id) => !associatedStudentIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException('Some selected users are not associated with this teacher');
    }

    // determine which students haven't been notified yet (if any)
    const previouslyNotified = new Set(
      (quiz.notifiedStudentIds || []).map((id: any) => id.toString()),
    );

    const newlyAssigned = sanitizedUserIds.filter((id) => !previouslyNotified.has(id));

    quiz.allowedUserIds = sanitizedUserIds.map((id) => new Types.ObjectId(id));
    quiz.visibility = 'RESTRICTED';

    // if there are new students and the quiz is already published, send them a
    // notification right away and update metadata
    if (newlyAssigned.length > 0 && quiz.status === 'published') {
      try {
        await this.userService.notifyAssociatedStudentsAboutPublishedQuiz({
          teacherId: associationTeacherId,
          quizTitle: quiz.title,
          difficulty: quiz.difficulty,
          studentIds: newlyAssigned,
        });
        // mark them as notified
        const unique = new Set(previouslyNotified);
        newlyAssigned.forEach((id) => unique.add(id));
        quiz.notifiedStudentIds = Array.from(unique).map((id) => new Types.ObjectId(id));
        quiz.lastNotifiedAt = new Date();
      } catch (err) {
        // log but don't fail the request
        console.error('failed to notify newly assigned users', err);
      }
    }

    await quiz.save();

    await redis.del(`quiz:${quizId}:users`);
    await redis.sadd(`quiz:${quizId}:users`, ...sanitizedUserIds);
    await redis.expire(`quiz:${quizId}:users`, 3600);

    await this.syncQuizCache(quizId);

    return { success: true, message: 'Assigned users updated successfully' };
  }

  /**
   * 🔄 Sync quiz metadata to Redis
   */
  async syncQuizCache(quizId: string) {
    if (!Types.ObjectId.isValid(quizId)) return;

    const quiz = await this.quizModel
      .findById(quizId)
      .select('visibility createdBy allowedBatchIds allowedUserIds')
      .lean();
    if (!quiz) return;

    const pipeline = redis.pipeline();
    const metaKey = `quiz:${quizId}:meta`;
    const batchKey = `quiz:${quizId}:batches`;
    const userKey = `quiz:${quizId}:users`;

    // 1️⃣ Store Meta Hash
    pipeline.hset(metaKey, {
      visibility: quiz.visibility,
      createdBy: quiz.createdBy.toString(),
    });
    pipeline.expire(metaKey, 3600); // 1h cache

    // 2️⃣ Store Batches Set
    pipeline.del(batchKey);
    if (quiz.allowedBatchIds && quiz.allowedBatchIds.length > 0) {
      pipeline.sadd(batchKey, ...quiz.allowedBatchIds.map(id => id.toString()));
      pipeline.expire(batchKey, 3600);
    }

    // 3️⃣ Store Assigned Users Set
    pipeline.del(userKey);
    if (quiz.allowedUserIds && quiz.allowedUserIds.length > 0) {
      pipeline.sadd(userKey, ...quiz.allowedUserIds.map((id) => id.toString()));
      pipeline.expire(userKey, 3600);
    }

    // 4️⃣ Legacy flag (for backward compatibility or fast check)
    if (quiz.visibility === 'PUBLIC') {
      pipeline.set(`quiz:${quizId}:public`, '1', 'EX', 3600);
    } else {
      pipeline.del(`quiz:${quizId}:public`);
    }

    await pipeline.exec();
  }

  /**
   * 🧹 Full Rebuild: Sync all quizzes to Redis
   */
  async syncAllQuizCache() {
    const quizzes = await this.quizModel.find({ status: 'published' }).select('_id').lean();
    for (const quiz of quizzes) {
      await this.syncQuizCache(quiz._id.toString());
    }
    return { success: true, count: quizzes.length };
  }
}
