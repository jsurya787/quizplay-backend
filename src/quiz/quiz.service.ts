import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from './quiz.schema';
import { CreateQuizDto } from './create-quiz.dto';
import { AddQuestionDto } from './add-question.dto';
import { UserService } from 'src/user/user.service';

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
) {
  const safeLimit = limit && limit > 0 && limit <= 100 ? limit : 10;
  const safeSkip = skip && skip >= 0 ? skip : 0;

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

  // 👤 CREATED BY ME (overrides admin filter if present)
  if (createdByMe) {
    filter.createdBy = new Types.ObjectId(createdByMe);
  } else {
    // 👑 ONLY ADMIN QUIZZES
    const admins = await this.userService.getListOfAdmins();

    if (!admins.length) {
      return {
        total: 0,
        limit: safeLimit,
        skip: safeSkip,
        data: [],
      };
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


  // 🟡 Create Draft Quiz
  async createDraft(dto: CreateQuizDto, userId:string) {
    return await this.quizModel.create({
      title: dto.title,
      description: dto.description, // ✅ NEW
      subjectId: dto.subjectId,
      difficulty: dto.difficulty,
      timeLimit: dto.timeLimit,
      status: 'draft',
      questions: [],
      totalMarks: 0,
      createdBy: new Types.ObjectId(userId), // ✅ FIX
    });
  }

  // 🟡 Update Draft Quiz
  async updateDraft(quizId: string, dto: CreateQuizDto, userId: string) {
    const quiz = await this.quizModel.findOne({
      _id: quizId,
     // createdBy: new Types.ObjectId(userId),
      status: 'draft',
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

    return quiz;
  }

  async getCreatedQuizzes(userId: string) {
    const createdBy = new Types.ObjectId(userId);

    const count = await this.quizModel.countDocuments({ createdBy });

    return {
      success: true,
      data: count,
    };
  }
}
