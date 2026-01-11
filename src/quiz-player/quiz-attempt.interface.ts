import { Types } from 'mongoose';

export interface QuizAttemptResult {
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  questions: {
    questionId: Types.ObjectId;
    status: 'correct' | 'wrong' | 'skipped';
    marks: number;
  }[];
}

export interface QuizAttemptAnswer {
  questionId: Types.ObjectId;
  selectedOptionIndex: number | null;
}

export interface QuizAttemptInterface {
  quizId: Types.ObjectId;
  userId: Types.ObjectId;
  answers: QuizAttemptAnswer[];
  score: number;
  isSubmitted: boolean;
  submittedAt?: Date;
  result?: QuizAttemptResult;
}
