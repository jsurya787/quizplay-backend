import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Subject } from '../subjects/subject.schema';

export type ChapterDocument = HydratedDocument<Chapter>;

@Schema({ timestamps: true })
export class Chapter {
  @Prop({ required: true, trim: true })
  title: string; // Algebra, Geometry

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: Subject.name, required: true })
  subject: Types.ObjectId;

  @Prop({ default: 0 })
  order: number; // Chapter order
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter);
