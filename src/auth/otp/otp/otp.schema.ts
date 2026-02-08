import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false, trim: true, lowercase: true })
  email?: string;

  @Prop({ required: true })
  otp?: string;

  @Prop({ required: true })
  expiresAt?: Date;

  @Prop({ default: false })
  verified?: boolean;

  @Prop({ default: 0 })
  attempts?: number;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
