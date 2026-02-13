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

  const filter: any = {
    status: 'published',
    visibility: 'PUBLIC',
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
  console.log("teacherQuizzesOnly-------->", teacherQuizzesOnly, currentUserId);
  if (teacherQuizzesOnly && currentUserId) {
    const user = await this.userService.findById(currentUserId);
    console.log("teacherQuizzesOnly-------->", teacherQuizzesOnly, user?.teachers );
    if (user && user.teachers && user.teachers.length > 0) {
      filter.createdBy = { $in: user.teachers };
      if (subjectId) {
       filter.subjectId = subjectId;
      }
      if (difficulty) {
        filter.difficulty = difficulty;
      }
       delete filter.visibility;
    } else {
      // If no teachers, return empty
      return { total: 0, limit: safeLimit, skip: safeSkip, data: [] };
    }
  } else if (createdByMe) {
    console.log("createdByMe-------->", createdByMe);
    // 👤 CREATED BY ME (overrides admin filter if present)
    filter.createdBy = new Types.ObjectId(createdByMe);
    delete filter.visibility;
  } else {
    // 👑 ONLY ADMIN QUIZZES (Default)
    const admins = await this.userService.getListOfAdmins();

    if (!admins.length) {
      return { total: 0, limit: safeLimit, skip: safeSkip, data: [] };
    }

    filter.createdBy = {
      $in: admins.map(id => new Types.ObjectId(id)),
    };
  }

  const quizzes = await this.quizModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(safeSkip)
    .limit(safeLimit)
    .select(
      'title description difficulty timeLimit totalMarks questions createdAt'
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

    return await this.quizModel.create({
      title: dto.title,
      description: dto.description, // ✅ NEW
      subjectId: dto.subjectId,
      difficulty: dto.difficulty,
      timeLimit: dto.timeLimit,
      status: 'draft',
      questions: [],
      totalMarks: 0,
      visibility: role === Role.ADMIN ? 'PUBLIC' : 'RESTRICTED',
      createdBy: new Types.ObjectId(userId), // ✅ FIX
    });
  }

  // 🟡 Update Draft Quiz
  async updateDraft(quizId: string, dto: CreateQuizDto, userId: string) {
    const quiz = await this.quizModel.findOne({
      _id:  new Types.ObjectId(quizId),
      createdBy: new Types.ObjectId(userId),
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or not owned by user');
    }

    Object.assign(quiz, dto);
    return await quiz.save();
  }

  // delete quiz 
  async deleteQuiz(quizId: string) {
    return this.quizModel.findByIdAndDelete(quizId);
  }


  // 🟡 Add Question
  async addQuestion(quizId: string, dto: AddQuestionDto) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const correctOptions = dto.options.filter(o => o.isCorrect);
    if (correctOptions.length !== 1) {
      throw new BadRequestException('Exactly one correct option is required');
    }

    const quiz = await this.quizModel.findOne({
      _id: quizId,
      status: 'draft',
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or already published');
    }

    quiz.questions.push(dto as any);
    quiz.totalMarks += dto.marks;

    await quiz.save();
    return quiz;
  }

  // Add Bulk Questions
  async addBulkQuestions(quizId: string, dtos: AddQuestionDto[]) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const quiz = await this.quizModel.findOne({
      _id: quizId,
      status: 'draft',
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or already published');
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
  ) {
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundException('Quiz not found');

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
  async removeQuestion(quizId: string, questionId: string) {
    if (!Types.ObjectId.isValid(quizId) || !Types.ObjectId.isValid(questionId)) {
    throw new BadRequestException('Invalid id');
    }

    const quiz = await this.quizModel.findOne({
    _id: quizId,
    status: 'draft',
    });

    if (!quiz) {
    throw new NotFoundException('Quiz not found or already published');
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
  async publishQuiz(quizId: string) {
    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.questions.length === 0) {
      throw new BadRequestException('Add at least one question');
    }

    quiz.status = 'published';
    await quiz.save();

    // 🚀 Warm Redis Cache
    await this.syncQuizCache(quizId);

    return { success: true, message: 'Quiz published successfully' };
  }

  async getCreatedQuizzes(userId: string) {
    const createdBy = new Types.ObjectId(userId);

    const count = await this.quizModel.countDocuments({ createdBy });

    return {
      success: true,
      data: count,
    };
  }

  async assignBatches(
    quizId: string,
    batchIds: string[],
    teacherId: string,
  ) {
    const quiz = await this.quizModel.findOne({
      _id: quizId,
      createdBy: teacherId,
    });

    if (!quiz) {
      throw new ForbiddenException('Not your quiz');
    }

    quiz.allowedBatchIds = batchIds.map(id => new Types.ObjectId(id));
    quiz.visibility = 'RESTRICTED';
    await quiz.save();

    // 🔥 Redis warm-up
    await redis.del(`quiz:${quizId}:batches`);
    await redis.sadd(`quiz:${quizId}:batches`, ...batchIds);
    await redis.expire(`quiz:${quizId}:batches`, 3600);

    // 🚀 Warm Redis Cache
    await this.syncQuizCache(quizId);

    return { success: true, message: 'Quiz published successfully' };
  }

  /**
   * 🔄 Sync quiz metadata to Redis
   */
  async syncQuizCache(quizId: string) {
    const quiz = await this.quizModel.findById(quizId).select('visibility createdBy allowedBatchIds').lean();
    if (!quiz) return;

    const pipeline = redis.pipeline();
    const metaKey = `quiz:${quizId}:meta`;
    const batchKey = `quiz:${quizId}:batches`;

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

    // 3️⃣ Legacy flag (for backward compatibility or fast check)
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
