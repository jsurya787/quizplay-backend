import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubjectDocument = HydratedDocument<Subject>;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true, trim: true, unique: true })
  name: string; // Math, Physics, Chemistry

  @Prop({
    required: true,
    trim: true,
    enum: ['entrance', 'government', 'state', 'bords'],
  })
  type: 'entrance' | 'government' | 'state' | 'bords';

  @Prop({ type: Number, default: 0, min: 0, index: true })
  priority: number;

  @Prop({ trim: true })
  subjectClass?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
 logoUrl?: string;


  @Prop({ trim: true })
  keyPoints?: Array<string>;

  @Prop({ default: true })
  isPrimary?: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
