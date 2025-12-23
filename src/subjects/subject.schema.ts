import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubjectDocument = HydratedDocument<Subject>;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true, trim: true, unique: true })
  name: string; // Math, Physics, Chemistry

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
