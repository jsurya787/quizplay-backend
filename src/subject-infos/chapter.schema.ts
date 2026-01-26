import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema({ _id: true })
class Section {
  @Prop() title: string;
  @Prop() content: string;
  @Prop() type: string;
  @Prop() order: number;
  @Prop({ default: true }) isActive: boolean;
}

@Schema({ timestamps: true })
export class Chapter extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Subject',
    index: true,
  })
  subjectId: Types.ObjectId;

  @Prop() name: string;
  @Prop() description: string;
  @Prop() order: number;
  @Prop({ default: true }) isActive: boolean;

  @Prop({ type: [Section], default: [] })
  sections: Section[];
}

export const ChapterSchema =
  SchemaFactory.createForClass(Chapter);
