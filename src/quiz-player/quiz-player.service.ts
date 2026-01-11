import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from '../quiz/quiz.schema';
import {
  QuizAttempt,
  QuizAttemptDocument,
} from './quiz-attempt.schema';

// ✅ ADD THIS TYPE
type QuestionResult = {
  questionId: Types.ObjectId;
  status: 'correct' | 'wrong' | 'skipped';
  marks: number;
};

@Injectable()
export class QuizPlayerService {
  constructor(
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,

    @InjectModel(QuizAttempt.name)
    private readonly attemptModel: Model<QuizAttemptDocument>,
  ) {}

  // 🎯 Get quiz WITHOUT correct answers
  async getPlayableQuiz(quizId: string) {
    const quiz = await this.quizModel
      .findOne({ _id: quizId, status: 'published' })
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

  // 📝 Start attempt
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

  // 💾 Save answer
  async saveAnswer({
    attemptId,
    questionId,
    selectedOptionIndex,
  }: {
    attemptId: string;
    questionId: string;
    selectedOptionIndex: number | null;
  }) {
    const attempt = await this.attemptModel.findById(attemptId);

    if (!attempt || attempt.isSubmitted) {
      throw new BadRequestException('Invalid attempt');
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
  async submitQuiz(attemptId: string) {
    const attempt = await this.attemptModel.findById(attemptId);

    if (!attempt || attempt.isSubmitted) {
      throw new BadRequestException('Already submitted');
    }

    const quiz = await this.quizModel.findById(attempt.quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    let score = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    // ✅ NOW TS IS HAPPY
    const questionResults: QuestionResult[] = [];

    for (const question of quiz.questions) {
      const userAnswer = attempt.answers.find(
        a => a.questionId.toString() === question._id.toString(),
      );

      if (!userAnswer || userAnswer.selectedOptionIndex === null) {
        skipped++;
        questionResults.push({
          questionId: question._id,
          status: 'skipped',
          marks: 0,
        });
        continue;
      }

      const selectedOption =
        question.options[userAnswer.selectedOptionIndex];

      if (selectedOption?.isCorrect) {
        correct++;
        score += question.marks;
        questionResults.push({
          questionId: question._id,
          status: 'correct',
          marks: question.marks,
        });
      } else {
        wrong++;
        questionResults.push({
          questionId: question._id,
          status: 'wrong',
          marks: 0,
        });
      }
    }

    const accuracy =
      correct + wrong > 0
        ? Math.round((correct / (correct + wrong)) * 100)
        : 0;

    attempt.score = score;
    attempt.isSubmitted = true;
    attempt.submittedAt = new Date();
    attempt.result = {
      correct,
      wrong,
      skipped,
      accuracy,
      questions: questionResults,
    };

    await attempt.save();

    return {
      totalMarks: quiz.totalMarks,
      score,
      correct,
      wrong,
      skipped,
      accuracy,
      questions: questionResults,
    };
  }
}
