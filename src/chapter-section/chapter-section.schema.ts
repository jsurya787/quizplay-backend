import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Chapter } from '../chapters/chapter.schema';

export enum SectionType {
  TEXT = 'TEXT',
  EXAMPLE = 'EXAMPLE',
  FORMULA = 'FORMULA',
  IMAGE = 'IMAGE',
  QUIZ = 'QUIZ',
}

@Schema({ timestamps: true })
export class ChapterSection {
  @Prop({ type: Types.ObjectId, ref: Chapter.name, required: true })
  chapter: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ enum: SectionType, required: true })
  type: SectionType;

  @Prop({ type: Object }) // flexible content
  content: any;

  @Prop({ default: 0 })
  order: number;
}

export const ChapterSectionSchema =
  SchemaFactory.createForClass(ChapterSection);
