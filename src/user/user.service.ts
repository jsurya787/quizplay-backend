import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

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
