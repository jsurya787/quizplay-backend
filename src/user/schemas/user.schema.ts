import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export enum UserSex {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
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

  @Prop({ type: [Types.ObjectId], ref: 'Batch', default: [] })
  batchIds?: Types.ObjectId[];

  // 🤝 Teacher-Student Relationships
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  students?: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  teachers?: Types.ObjectId[];

  @Prop({ enum: UserSex, required: false })
  sex?: UserSex;

  // 👤 Common profile field (all roles)
  @Prop({ trim: true, default: '' })
  about?: string;

  @Prop({ default: true, index: true })
  isActive?: boolean;

  @Prop({ required: false })
  deactivatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
