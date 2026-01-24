import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  create(user: Partial<User>) {
    return this.userModel.create(user);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email }).select('+password');
  }
  
  async upsertByEmail(email: string, data: Partial<User>) {
    return this.userModel.findOneAndUpdate(
      { email },
      { $set: data },
      { new: true, upsert: true },
    );
  }

  async findOrCreateByGoogle(payload: any) {
    let user = await this.userModel.findOne({
      email: payload.email,
    });

    if (!user) {
      user = await this.userModel.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        isVerified: true,
      });
    } else if (!user.googleId) {
      // 🔁 Merge OTP user with Google
      user.googleId = payload.sub;
      user.isVerified = true;
      await user.save();
    }

    return user;
  }

  async findOrCreateByPhone(phone: string) {
    let user = await this.userModel.findOne({ phone });

    if (!user) {
      user = await this.userModel.create({
        phone,
        isVerified: true,
      });
    }

    return user;
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          password: hashedPassword,
          authProvider: 'password', // optional but recommended
        },
      },
    );
  }

  async findById(userId: string) {
    return this.userModel.findById(userId);
  }


}
