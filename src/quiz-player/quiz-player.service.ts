import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from '../quiz/quiz.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import {
  QuizAttempt,
  QuizAttemptDocument,
} from './quiz-attempt.schema';

type QuestionResult = {
  questionId: Types.ObjectId;
  question: string;

  options: {
    text: string;
    isSelected: boolean;
  }[];

  status: 'correct' | 'wrong' | 'skipped';
  marks: number;

  correctOptionIndex: number;
};


@Injectable()
export class QuizPlayerService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,

    @InjectModel(QuizAttempt.name)
    private readonly attemptModel: Model<QuizAttemptDocument>,
  ) {}

  async getTeacherStats(teacherId: string, batchIds: string[]) {
    // 1️⃣ Count students in teacher's batches
    const studentCount = await this.userModel.countDocuments({
      role: 'STUDENT',
      batchIds: { $in: batchIds.map(id => new Types.ObjectId(id)) },
    });

    // 2️⃣ Count total submissions for teacher's quizzes
    const quizzes = await this.quizModel.find({ createdBy: new Types.ObjectId(teacherId) }).select('_id').lean();
    const quizIds = quizzes.map(q => q._id);

    const submissionCount = await this.attemptModel.countDocuments({
      quizId: { $in: quizIds },
      isSubmitted: true,
    });

    return {
      success: true,
      data: {
        totalStudents: studentCount,
        totalSubmissions: submissionCount,
      }
    };
  }

  // 🎯 Get quiz WITHOUT correct answers
  async getPlayableQuiz(quizId: string, onlyPublic = false) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new BadRequestException('Invalid quiz id');
    }

    const filter: any = { _id: quizId, status: 'published' };
    if (onlyPublic) {
      filter.visibility = 'PUBLIC';
    }

    const quiz = await this.quizModel
      .findOne(filter)
      .lean();

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return {
      success: true,
      data: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          marks: q.marks,
          options: q.options.map(o => ({
            text: o.text,
          })),
        })),
      },
    };
  }

  // 📝 Start attempt (authenticated users)
  async startAttempt(quizId: string, userId: string) {
    const attempt = await this.attemptModel.create({
      quizId: new Types.ObjectId(quizId),
      userId: new Types.ObjectId(userId),
    });

    return {
      success: true,
      attemptId: attempt._id,
    };
  }

  // 📝 Start attempt (guest users)
  async startAttemptGuest(quizId: string, guestSessionId: string) {
    const quiz = await this.quizModel
      .findOne({ _id: quizId, status: 'published', visibility: 'PUBLIC' })
      .select('_id')
      .lean();

    if (!quiz) {
      throw new ForbiddenException('This quiz is not available for guest users');
    }

    const attempt = await this.attemptModel.create({
      quizId: new Types.ObjectId(quizId),
      guestSessionId: new Types.ObjectId(guestSessionId),
    });

    return {
      success: true,
      attemptId: attempt._id,
    };
  }

  // 💾 Save answer
  async saveAnswer(
    {
      attemptId,
      questionId,
      selectedOptionIndex,
    }: {
      attemptId: string;
      questionId: string;
      selectedOptionIndex: number | null;
    },
    guestSessionId?: string,
  ) {
    const attempt = await this.attemptModel.findById(attemptId);

    if (!attempt || attempt.isSubmitted) {
      throw new BadRequestException('Invalid attempt');
    }

    // 🔒 Validate guest session ownership
    if (guestSessionId) {
      if (attempt.guestSessionId?.toString() !== guestSessionId) {
        throw new BadRequestException(
          'This attempt does not belong to your session',
        );
      }
    }

    const existingAnswer = attempt.answers.find(
      a => a.questionId.toString() === questionId,
    );

    if (existingAnswer) {
      existingAnswer.selectedOptionIndex = selectedOptionIndex;
    } else {
      attempt.answers.push({
        questionId: new Types.ObjectId(questionId),
        selectedOptionIndex,
      });
    }

    await attempt.save();
    return { success: true };
  }

  // 🚀 Submit quiz
  async submitQuiz(attemptId: string, guestSessionId?: string) {
    const attempt = await this.attemptModel.findById(attemptId);

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    // 🔒 Validate guest session ownership
    if (guestSessionId) {
      if (attempt.guestSessionId?.toString() !== guestSessionId) {
        throw new BadRequestException(
          'This attempt does not belong to your session',
        );
      }
    }

    if (attempt.isSubmitted) {
      const quizResult = await this.quizModel.findById(attempt.quizId);
      return {
        quizTitle: quizResult?.title || 'Quiz Result',
        totalMarks: quizResult?.totalMarks || 0,
        score: attempt.score,
        correct: attempt.result?.correct || 0,
        wrong: attempt.result?.wrong || 0,
        skipped: attempt.result?.skipped || 0,
        accuracy: attempt.result?.accuracy || 0,
        questions: attempt.result?.questions || [],
      };
    }

    const quiz = await this.quizModel.findById(attempt.quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    let score = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    const questionResults: QuestionResult[] = [];

    for (const question of quiz.questions) {
      const userAnswer = attempt.answers.find(
        (a) => a.questionId.toString() === question._id.toString(),
      );

      const selectedIndex = userAnswer?.selectedOptionIndex ?? null;

      const optionsResult = question.options.map((opt, index) => ({
        text: opt.text,
        isSelected: selectedIndex === index,
      }));

      const correctIndex = question.options.findIndex((o) => o.isCorrect);

      if (selectedIndex === null) {
        skipped++;

        questionResults.push({
          questionId: question._id as any,
          question: question.questionText,
          options: optionsResult,
          status: 'skipped',
          marks: 0,
          correctOptionIndex: correctIndex,
        });
        continue;
      }

      if (question.options[selectedIndex]?.isCorrect) {
        correct++;
        score += question.marks;

        questionResults.push({
          questionId: question._id as any,
          question: question.questionText,
          options: optionsResult,
          status: 'correct',
          marks: question.marks,
          correctOptionIndex: correctIndex,
        });
      } else {
        wrong++;

        questionResults.push({
          questionId: question._id as any,
          question: question.questionText,
          options: optionsResult,
          status: 'wrong',
          marks: 0,
          correctOptionIndex: correctIndex,
        });
      }
    }

    const accuracy =
      correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;

    attempt.score = score;
    attempt.isSubmitted = true;
    attempt.submittedAt = new Date();
    attempt.result = {
      totalMarks: quiz.totalMarks,
      correct,
      wrong,
      skipped,
      accuracy,
      questions: questionResults as any,
    };

    await attempt.save();

    return {
      quizTitle: quiz.title,
      totalMarks: quiz.totalMarks,
      score,
      correct,
      wrong,
      skipped,
      accuracy,
      questions: questionResults,
    };
  }

  async getAttemptedQuizzesCount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const userObjectId = new Types.ObjectId(userId);

    const count = await this.attemptModel.countDocuments({
      userId: userObjectId,
    });

    return {
      success: true,
      count: count,
    };
  }

  async getAttemptedQuizzes(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const userObjectId = new Types.ObjectId(userId);

    const attempts = await this.attemptModel
      .find({ userId: userObjectId, isSubmitted: true })
      .populate('quizId', 'title difficulty')
      .sort({ submittedAt: -1 })
      .lean();

    return {
      success: true,
      data: attempts.map((attempt: any) => ({
        _id: attempt._id,
        attemptId: attempt._id,
        quizId: attempt.quizId?._id,
        quizTitle: attempt.quizId?.title || 'Unknown Quiz',
        difficulty: attempt.quizId?.difficulty || 'N/A',
        score: attempt.score ?? 0,
        accuracy: attempt.result?.accuracy ?? 0,
        submittedAt: attempt.submittedAt,
      })),
    };
  }

  async getTeacherSubmissions(teacherId: string) {
    // 1️⃣ Find all quizzes created by this teacher
    const quizzes = await this.quizModel.find({ createdBy: new Types.ObjectId(teacherId) }).select('_id title').lean();
    const quizIds = quizzes.map(q => q._id);

    // 2️⃣ Find all submitted attempts for these quizzes
    const submissions = await this.attemptModel
      .find({ quizId: { $in: quizIds }, isSubmitted: true })
      .populate('userId', 'firstName lastName email name') // Student info
      .populate('quizId', 'title') // Quiz info
      .sort({ submittedAt: -1 })
      .lean();

    return {
      success: true,
      data: submissions.map((s: any) => ({
        _id: s._id,
        studentName: s.userId?.firstName ? `${s.userId.firstName} ${s.userId.lastName}` : (s.userId?.name || 'Unknown Student'),
        studentEmail: s.userId?.email,
        quizTitle: s.quizId?.title || 'Deleted Quiz',
        score: s.score,
        accuracy: s.result?.accuracy,
        submittedAt: s.submittedAt
      }))
    };
  }

  /**
   * 📊 Get quiz result by attempt ID
   * Supports both authenticated users and guest sessions
   */
  async getQuizResult(attemptId: string, guestSessionId?: string) {
    const attempt = await this.attemptModel.findById(attemptId);

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    // 🔒 Validate guest session ownership
    if (guestSessionId) {
      if (attempt.guestSessionId?.toString() !== guestSessionId) {
        throw new BadRequestException(
          'This result does not belong to your session',
        );
      }
    }

    // Check if quiz was submitted
    if (!attempt.isSubmitted) {
      throw new BadRequestException('Quiz not yet submitted');
    }

    // Get quiz details for total marks
    const quiz = await this.quizModel.findById(attempt.quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Return the result
    return {
      success: true,
      data: {
        quizTitle: quiz.title,
        totalMarks: quiz.totalMarks,
        score: attempt.score,
        correct: attempt.result?.correct || 0,
        wrong: attempt.result?.wrong || 0,
        skipped: attempt.result?.skipped || 0,
        accuracy: attempt.result?.accuracy || 0,
        questions: attempt.result?.questions || [],
      },
    };
  }
}
