import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  title: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
