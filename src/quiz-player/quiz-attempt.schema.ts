import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class QuizAttempt {
  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true })
  quizId: Types.ObjectId;

  // 👤 User ID (optional for guest users)
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  // 🎫 Guest Session ID (for non-authenticated users)
  @Prop({ type: Types.ObjectId, ref: 'GuestSession', required: false, index: true })
  guestSessionId?: Types.ObjectId;


  @Prop({
    type: [
      {
        questionId: { type: Types.ObjectId },
        selectedOptionIndex: { type: Number, default: null },
      },
    ],
    default: [],
  })
  answers: {
    questionId: Types.ObjectId;
    selectedOptionIndex: number | null;
  }[];

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: false })
  isSubmitted: boolean;

  @Prop()
  submittedAt?: Date;

  // ✅ ADDED RESULT FIELD
  @Prop({
    type: {
      correct: Number,
      wrong: Number,
      skipped: Number,
      accuracy: Number,
      questions: [
        {
          questionId: { type: Types.ObjectId },
          question: String,
          options: [
            {
              text: String,
              isSelected: Boolean,
            },
          ],
          status: {
            type: String,
            enum: ['correct', 'wrong', 'skipped'],
          },
          marks: Number,
          correctOptionIndex: Number,
        },
      ],
    },
    default: null,
  })
  result?: {
    totalMarks?: number; // Added totalMarks to stored result
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
    questions: {
      questionId: Types.ObjectId;
      question: string;
      options: {
        text: string;
        isSelected: boolean;
      }[];
      status: 'correct' | 'wrong' | 'skipped';
      marks: number;
      correctOptionIndex: number;
    }[];
  };
}

export type QuizAttemptDocument = QuizAttempt & Document;
export const QuizAttemptSchema =
  SchemaFactory.createForClass(QuizAttempt);
