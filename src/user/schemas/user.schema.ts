import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

@Schema({ timestamps: true })
export class User {
  // ✅ New fields
  @Prop({
    trim: true,
    default: 'Guest',
  })
  firstName?: string;

  @Prop({
    trim: true,
    default: 'User',
  })
  lastName?: string;

  // ⚠️ Optional legacy / display name
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
    lowercase: true,
    trim: true,
  })
  authProvider?: string;

  @Prop({
    unique: true,
    sparse: true,
    trim: true,
  })
  phone?: string;

  // 🔐 Never returned by default
  @Prop({
    type: String,
    required: false,
    select: false,
  })
  password?: string;

  // 🔑 Google Auth
  @Prop({
    unique: true,
    sparse: true,
  })
  googleId?: string;

  @Prop({
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role?: UserRole;

  // ✅ Verified via OTP or Google
  @Prop({ default: false })
  isVerified?: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
