import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { SignupDto } from 'src/auth/dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { redis } from 'src/redis/redis.provider';

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

  /* ------------------ TEACHER-STUDENT RELATIONSHIPS ------------------ */

  /**
   * 🤝 Link a student to a teacher by email
   */
  async linkStudentByEmail(teacherId: string, studentEmail: string) {
    const student = await this.userModel.findOne({ email: studentEmail.toLowerCase() });

    if (!student) {
      throw new Error('Student not found in our system');
    }

    // 1️⃣ Add student to teacher's list
    await this.userModel.findByIdAndUpdate(teacherId, {
      $addToSet: { students: student._id },
    });

    // 2️⃣ Add teacher to student's list
    await this.userModel.findByIdAndUpdate(student._id, {
      $addToSet: { teachers: new Types.ObjectId(teacherId) },
    });

    // 🚀 Update Redis Cache for student
    await redis.sadd(`user:${student._id}:teachers`, teacherId);
    await redis.expire(`user:${student._id}:teachers`, 86400); // 24h cache

    return {
      success: true,
      student: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
      },
    };
  }

  /**
   * 📋 Get all students linked to a teacher
   */
  async getTeacherStudents(teacherId: string) {
    const teacher = await this.userModel
      .findById(teacherId)
      .populate('students', 'firstName lastName email')
      .lean();

    return teacher?.students || [];
  }

  /**
   * 🔄 Sync user relations (teachers & batches) to Redis
   */
  async syncUserRelations(userId: string) {
    const user = await this.userModel.findById(userId).select('teachers batchIds').lean();
    if (!user) return;

    const teacherIds = (user.teachers || []).map(id => id.toString());
    const batchIds = (user.batchIds || []).map(id => id.toString());

    const pipeline = redis.pipeline();
    
    // Clear and set teachers
    pipeline.del(`user:${userId}:teachers`);
    if (teacherIds.length > 0) {
      pipeline.sadd(`user:${userId}:teachers`, ...teacherIds);
      pipeline.expire(`user:${userId}:teachers`, 86400);
    }

    // Clear and set batches
    pipeline.del(`user:${userId}:batches`);
    if (batchIds.length > 0) {
      pipeline.sadd(`user:${userId}:batches`, ...batchIds);
      pipeline.expire(`user:${userId}:batches`, 86400);
    }

    await pipeline.exec();
  }

  /**
   * 🧹 Full Rebuild: Sync all users to Redis
   */
  async syncAllUserRelations() {
    const users = await this.userModel.find({}).select('_id teachers batchIds').lean();
    for (const user of users) {
      await this.syncUserRelations(user._id.toString());
    }
    return { success: true, count: users.length };
  }

  /* ------------------ ADMIN PANEL METHODS ------------------ */

  /**
   * 📊 Get aggregated stats for Admin Dashboard
   */
  async getAdminStats() {
    const [totalUsers, teachers, students] = await Promise.all([
      this.userModel.countDocuments({}),
      this.userModel.countDocuments({ role: 'TEACHER' }),
      this.userModel.countDocuments({ role: 'STUDENT' }),
    ]);

    return {
      totalUsers,
      totalTeachers: teachers,
      totalStudents: students,
    };
  }

  /**
   * 👨‍🏫 Get list of all teachers
   */
  async getTeachersList() {
    return this.userModel
      .find({ role: 'TEACHER' })
      .select('firstName lastName email createdAt students')
      .lean();
  }

  /**
   * 🎓 Get list of all students
   */
  async getStudentsList() {
    return this.userModel
      .find({ role: 'STUDENT' })
      .select('firstName lastName email createdAt teachers')
      .lean();
  }
  /**
   * 👑 Update user role (Admin only)
   */
  async updateUserRole(userId: string, role: string) {
    // Basic validation
    if (role !== 'STUDENT' && role !== 'TEACHER') {
       throw new Error('Invalid role. Only STUDENT or TEACHER allowed via this API.');
    }

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Clear cache might be needed if you cache user details by ID
    // For now, let's just ensure we return success
    
    // If we had a specific user cache key, we'd delete it here:
    // await redis.del(`user:${userId}`);

    return {
      success: true,
      message: `User role updated to ${role}`,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    };
  }
}
