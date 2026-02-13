import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/* ============================
   QUESTION SUB-SCHEMA
============================ */

@Schema({ _id: true })
export class Question {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  questionText!: string;

  @Prop({
    type: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    required: true,
    validate: {
      validator: (v: any[]) => Array.isArray(v) && v.length === 4,
      message: 'Exactly 4 options are required',
    },
  })
  options!: { text: string; isCorrect: boolean }[];

  @Prop({ default: 4, min: 1 })
  marks!: number;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

/* ============================
   QUIZ SCHEMA
============================ */

@Schema({ timestamps: true })
export class Quiz {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 300 })
  description!: string;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subjectId!: Types.ObjectId;

  @Prop({ enum: ['easy', 'medium', 'hard'], required: true })
  difficulty!: 'easy' | 'medium' | 'hard';

  @Prop({ required: true, min: 1 })
  timeLimit!: number;

  @Prop({ enum: ['draft', 'published'], default: 'draft' })
  status!: 'draft' | 'published';

  @Prop({ type: [QuestionSchema], default: [] })
  questions!: Question[];

  @Prop({ default: 0 })
  totalMarks!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  createdBy!: Types.ObjectId;

  /* ============================
     ACCESS CONTROL (FINAL)
  ============================ */

  @Prop({
    type: [Types.ObjectId],
    ref: 'Batch',
    default: [],
  })
  allowedBatchIds!: Types.ObjectId[];

  @Prop({
    enum: ['PUBLIC', 'RESTRICTED'],
    default: 'PUBLIC',
    index: true,
  })
  visibility!: 'PUBLIC' | 'RESTRICTED';
}

export type QuizDocument = Quiz & Document;
export const QuizSchema = SchemaFactory.createForClass(Quiz);
