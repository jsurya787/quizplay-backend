import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { SignupDto } from 'src/auth/dto/signup.dto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService implements OnModuleInit {
  public adminsCache: string[] = [];
  private adminsCacheAt = 0;
  private readonly CACHE_TTL = 24 * 60 * 1000; // 1 day in  milliseconds 

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ✅ Called once when module initializes
  async onModuleInit() {
    await this.refreshAdminsCache();
  }

  /* ------------------ BASIC METHODS ------------------ */

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

  async findById(userId: string) {
    return this.userModel.findById(userId);
  }

  /* ------------------ AUTH HELPERS ------------------ */

  async findOrCreateByGoogle(payload: any) {
    let user = await this.userModel.findOne({ email: payload.email });

    if (!user) {
      user = await this.userModel.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        isVerified: true,
      });
    } else if (!user.googleId) {
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

  async findOrCreateByEmail(emall: string) {
    let user = await this.userModel.findOne({ email: emall });

    // if (!user) {
    //   user = await this.userModel.create({
    //     email: emall,
    //     isVerified: true,
    //   });
    // }

    return user;
  }

  async findOrCreateByEmailForSignup(signedUpUser: SignupDto) {
    const email = signedUpUser.email.toLowerCase();

    let user = await this.userModel.findOne({ email });

    if (!user) {
      const hashedPassword = await bcrypt.hash(signedUpUser?.password || '', SALT_ROUNDS);
      user = await this.userModel.create({
        email,
        firstName: signedUpUser.firstName, // optional → schema default if undefined
        lastName: signedUpUser.lastName,   // optional → schema default if undefined
        password: hashedPassword,
        authProvider: 'password',
        isVerified: false, // OTP will verify it
      });
    }

    return user;
  }


  async markAsVerified(userId: string) {
    return this.userModel.updateOne(
      { _id: userId },
      { $set: { isVerified: true } },
    );
  }

  async forgotPassword(email: string) {
    return this.userModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { forgotPassword: true } },
    );
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          password: hashedPassword,
          authProvider: 'password',
        },
      },
    );
  }

  /* ------------------ ADMIN CACHE ------------------ */

  async getListOfAdmins(): Promise<string[]> {
    const now = Date.now();

    // ✅ Return cache if valid
    if (
      this.adminsCache.length &&
      now - this.adminsCacheAt < this.CACHE_TTL
    ) {
      return this.adminsCache;
    }

    // ❗ Refresh if expired
    return this.refreshAdminsCache();
  }

  private async refreshAdminsCache(): Promise<string[]> {
    const admins = await this.userModel
      .find({ role: 'ADMIN' })
      .select('_id')
      .lean();

    this.adminsCache = admins.map(a => a._id.toString());
    this.adminsCacheAt = Date.now();

    return this.adminsCache;
  }

  // 🔄 Call this when admin role changes
  clearAdminsCache() {
    this.adminsCache = [];
    this.adminsCacheAt = 0;
  }
}
