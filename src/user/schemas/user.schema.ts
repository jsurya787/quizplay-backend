import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ trim: true })
  name?: string;

  @Prop({
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  })
  email?: string;

  @Prop({
    unique: true,
    sparse: true,
    trim: true,
  })
  phone?: string;

  // For Google authentication
  @Prop({
    unique: true,
    sparse: true,
  })
  googleId?: string;

  @Prop({
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  // true after OTP or Google verification
  @Prop({ default: false })
  isVerified: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
