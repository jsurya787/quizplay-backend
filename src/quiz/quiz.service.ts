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

@Injectable()
export class QuizService {
  constructor(
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}
  // 📄 Get quizzes with limit (for quiz list page)
  async findAll(limit?: number, skip?: number) {
    const safeLimit =
      limit && limit > 0 && limit <= 100 ? limit : 10;

    const safeSkip = skip && skip >= 0 ? skip : 0;

    const quizzes = await this.quizModel
      .find({ isActive: true, status: 'published' }) // only published quizzes
      .sort({ createdAt: -1 })
      .skip(safeSkip)
      .limit(safeLimit)
      .select(
        'title description difficulty timeLimit totalMarks questions createdAt'
      )
      .lean({ virtuals: true }); // ✅ REQUIRED for questionsCount

    const total = await this.quizModel.countDocuments({
      isActive: true,
      status: 'published',
    });

    return {
      total,
      limit: safeLimit,
      skip: safeSkip,
      data: quizzes.map(q => ({
        ...q,
        questionsCount: q.questions?.length || 0, // safety
        questions: undefined, // never send questions list
      })),
    };
  }


  // 🟡 Create Draft Quiz
  async createDraft(dto: CreateQuizDto) {
    return await this.quizModel.create({
      title: dto.title,
      description: dto.description, // ✅ NEW
      subjectId: dto.subjectId,
      difficulty: dto.difficulty,
      timeLimit: dto.timeLimit,
      status: 'draft',
      questions: [],
      totalMarks: 0,
    });
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
}
