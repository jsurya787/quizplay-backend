import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema({ timestamps: true })
export class SubjectInfo extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Subject',
    unique: true,
    required: true,
  })
  subjectId: Types.ObjectId;

  @Prop({
    type: [
      {
        title: String,
        description: String,
        priority: Number,
      },
    ],
    default: [],
  })
  hotTopics: any[];
}

export const SubjectInfoSchema =
  SchemaFactory.createForClass(SubjectInfo);
