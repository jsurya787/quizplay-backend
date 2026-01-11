import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class QuizAttempt {
  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true })
  quizId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

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
          status: {
            type: String,
            enum: ['correct', 'wrong', 'skipped'],
          },
          marks: Number,
        },
      ],
    },
    default: null,
  })
  result?: {
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
    questions: {
      questionId: Types.ObjectId;
      status: 'correct' | 'wrong' | 'skipped';
      marks: number;
    }[];
  };
}

export type QuizAttemptDocument = QuizAttempt & Document;
export const QuizAttemptSchema =
  SchemaFactory.createForClass(QuizAttempt);
