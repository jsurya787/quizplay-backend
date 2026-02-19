import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InstituteDocument = HydratedDocument<Institute>;

@Schema({ timestamps: true })
export class Institute {
  @Prop({ trim: true, default: '', maxlength: 120 })
  name?: string;

  @Prop({ trim: true, default: '', maxlength: 1000 })
  about?: string;

  @Prop({ trim: true, default: '' })
  logo?: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  teachers: Types.ObjectId[];
}

export const InstituteSchema = SchemaFactory.createForClass(Institute);
