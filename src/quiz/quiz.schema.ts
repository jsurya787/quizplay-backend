import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/* ============================
   QUESTION SUB-SCHEMA
============================ */


@Schema({ _id: true })
export class Question {
  _id: Types.ObjectId; // ✅ ADD THIS

  @Prop({ required: true, trim: true })
  questionText: string;

  @Prop({
    type: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    required: true,
    validate: {
      validator: (v: any[]) => v.length === 4,
      message: 'Exactly 4 options are required',
    },
  })
  options: {
    text: string;
    isCorrect: boolean;
  }[];

  @Prop({ default: 4, min: 1 })
  marks: number;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

/* ============================
   QUIZ SCHEMA
============================ */

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Quiz {
  @Prop({ required: true, trim: true })
  title: string;

  /* ✅ NEW: Description */
  @Prop({
    required: true,
    trim: true,
    maxlength: 300,
  })
  description: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Subject',
    required: true,
  })
  subjectId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  })
  difficulty: 'easy' | 'medium' | 'hard';

  @Prop({ required: true, min: 1 })
  timeLimit: number; // minutes

  @Prop({
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  })
  status: 'draft' | 'published';

  @Prop({ type: [QuestionSchema], default: [] })
  questions: Question[];

  @Prop({ default: 0, min: 0 })
  totalMarks: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;

}

export type QuizDocument = Quiz & Document;
export const QuizSchema = SchemaFactory.createForClass(Quiz);
