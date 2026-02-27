import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole, UserSex } from './schemas/user.schema';
import { SignupDto } from 'src/auth/dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { redis } from 'src/redis/redis.provider';
import {
  buildAdminRoleUpdateTemplate,
  buildQuizPublishedForStudentTemplate,
  buildStudentAddedByTeacherTemplate,
  buildTeacherPromotionTemplate,
  EmailTemplate,
} from 'src/mail/templates';
import { UpdateProfileDto } from 'src/auth/dto/update-profile.dto';
import { Institute, InstituteDocument } from './schemas/institute.schema';
import { UpdateTeacherInstituteDto } from './teacher/dto/update-teacher-institute.dto';
import { EmailSenderService } from 'src/mail/email-sender.service';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService implements OnModuleInit {
  public adminsCache: string[] = [];
  private adminsCacheAt = 0;
  private readonly CACHE_TTL = 24 * 60 * 1000; // 1 day in  milliseconds 

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Institute.name)
    private readonly instituteModel: Model<InstituteDocument>,
    private readonly emailSender: EmailSenderService,
  ) {}

  onModuleInit() {
    return this.refreshAdminsCache();
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

  async updateBasicProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }

    if (dto.sex !== undefined) {
      user.sex = dto.sex as UserSex;
    }

    if (dto.about !== undefined) {
      user.about = dto.about.trim();
    }

    user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name;

    await user.save();

    return {
      success: true,
      message: 'Profile updated',
      user: {
        _id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        sex: user.sex || null,
        about: user.about || '',
      },
    };
  }

  /* ------------------ AUTH HELPERS ------------------ */

  async findOrCreateByGoogle(payload: any) {
    let isNewUser = false;
    let user = await this.userModel.findOne({ email: payload.email });

    if (!user) {
      user = await this.userModel.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        isVerified: true,
      });
      isNewUser = true;
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      user.isVerified = true;
      await user.save();
    }

    return { user, isNewUser };
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
    const [student, teacher] = await Promise.all([
      this.userModel.findOne({ email: studentEmail.toLowerCase() }),
      this.userModel.findById(teacherId).select('firstName lastName name email'),
    ]);

    if (!student) {
      throw new Error('Student not found in our system');
    }

    if (!teacher) {
      throw new Error('Teacher not found in our system');
    }

    // 1️⃣ Add student to teacher's list (only when new link)
    const teacherUpdateResult = await this.userModel.updateOne({
      _id: teacherId,
      students: { $ne: student._id },
    }, {
      $addToSet: { students: student._id },
    });
    const isNewLink = teacherUpdateResult.modifiedCount > 0;

    // 2️⃣ Add teacher to student's list
    await this.userModel.findByIdAndUpdate(student._id, {
      $addToSet: { teachers: new Types.ObjectId(teacherId) },
    });

    // 🚀 Update Redis Cache for student
    await redis.sadd(`user:${student._id}:teachers`, teacherId);
    await redis.expire(`user:${student._id}:teachers`, 86400); // 24h cache

    const { appName, appLogoUrl, webUrl } = this.emailSender.getBranding();
    let studentEmailSent = false;

    if (isNewLink && student.email) {
      const studentName = student.firstName || 'Student';
      const teacherDisplayName =
        [teacher.firstName, teacher.lastName].filter(Boolean).join(' ').trim() ||
        teacher.name ||
        'Your Teacher';

      studentEmailSent = await this.sendStudentAddedEmail({
        studentEmail: student.email,
        studentName,
        teacherName: teacherDisplayName,
        teacherEmail: teacher.email,
        appName,
        appLogoUrl,
        webUrl,
      });
    }

    return {
      success: true,
      message: isNewLink ? 'Student added successfully' : 'Student already linked',
      emailNotice:
        isNewLink && student.email
          ? studentEmailSent
            ? `Notification email sent to ${student.email}`
            : `Student added, but failed to send email to ${student.email}`
          : 'No email sent',
      student: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
      },
    };
  }

  /**
   * 🔗❌ Unlink student from teacher (relation only, no DB delete)
   */
  async unlinkStudent(teacherId: string, studentId: string) {
    if (!Types.ObjectId.isValid(teacherId) || !Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid teacher or student id');
    }

    const [teacher, student] = await Promise.all([
      this.userModel.findById(teacherId).select('_id role students'),
      this.userModel.findById(studentId).select('_id teachers'),
    ]);

    if (!teacher || teacher.role !== 'TEACHER') {
      throw new Error('Teacher not found');
    }

    if (!student) {
      throw new Error('Student not found');
    }

    await Promise.all([
      this.userModel.updateOne(
        { _id: teacher._id },
        { $pull: { students: new Types.ObjectId(studentId) } },
      ),
      this.userModel.updateOne(
        { _id: student._id },
        { $pull: { teachers: new Types.ObjectId(teacherId) } },
      ),
    ]);

    await redis.srem(`user:${studentId}:teachers`, teacherId);

    return {
      success: true,
      message: 'Student removed from your list',
      studentId,
    };
  }

  /**
   * 📋 Get all students linked to a teacher
   */
  async getTeacherStudents(teacherId: string, search?: string) {
    const searchFilter = this.buildUserSearchFilter(search);
    const teacher = await this.userModel
      .findById(teacherId)
      .populate({
        path: 'students',
        select: 'firstName lastName email createdAt',
        match: searchFilter,
      })
      .lean();

    return teacher?.students || [];
  }

  async getTeacherInstitute(teacherId: string) {
    const teacher = await this.userModel.findById(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    if (teacher.role !== 'TEACHER') {
      throw new Error('Only teachers can access this data');
    }

    const institute = await this.instituteModel
      .findOne({ teachers: new Types.ObjectId(teacherId) })
      .select('_id name about logo teachers')
      .lean();

    return {
      success: true,
      data: institute || {
        _id: null,
        name: '',
        about: '',
        logo: '',
        teachers: [teacherId],
      },
    };
  }

  async updateTeacherInstitute(teacherId: string, dto: UpdateTeacherInstituteDto) {
    const teacher = await this.userModel.findById(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    if (teacher.role !== 'TEACHER') {
      throw new Error('Only teachers can update institute');
    }

    const teacherObjectId = new Types.ObjectId(teacherId);
    let institute = await this.instituteModel.findOne({
      teachers: teacherObjectId,
    });

    if (!institute) {
      institute = new this.instituteModel({
        name: (dto.name || '').trim(),
        about: (dto.about || '').trim(),
        logo: (dto.logo || '').trim(),
        teachers: [teacherObjectId],
      });
    }

    if (dto.name !== undefined) {
      institute.name = dto.name.trim();
    }

    if (dto.about !== undefined) {
      institute.about = dto.about.trim();
    }

    if (dto.logo !== undefined) {
      institute.logo = dto.logo.trim();
    }

    const hasTeacher = institute.teachers.some(
      (id) => id.toString() === teacherId,
    );
    if (!hasTeacher) {
      institute.teachers.push(teacherObjectId);
    }

    await institute.save();

    return {
      success: true,
      message: 'Institute updated',
      data: {
        _id: institute._id,
        name: institute.name,
        about: institute.about || '',
        logo: institute.logo || '',
        teachers: institute.teachers,
      },
    };
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
    const [totalUsers, teachers, students, inactiveUsers] = await Promise.all([
      this.userModel.countDocuments({ isActive: { $ne: false } }),
      this.userModel.countDocuments({ role: 'TEACHER', isActive: { $ne: false } }),
      this.userModel.countDocuments({ role: 'STUDENT', isActive: { $ne: false } }),
      this.userModel.countDocuments({ isActive: false }),
    ]);

    return {
      totalUsers,
      totalTeachers: teachers,
      totalStudents: students,
      totalInactiveUsers: inactiveUsers,
    };
  }

  /**
   * 👨‍🏫 Get list of all teachers
   */
  async getTeachersList() {
    return this.userModel
      .find({ role: 'TEACHER', isActive: { $ne: false } })
      .select('firstName lastName email createdAt students')
      .lean();
  }

  /**
   * 🎓 Get list of all students
   */
  async getStudentsList() {
    return this.userModel
      .find({ role: 'STUDENT', isActive: { $ne: false } })
      .select('firstName lastName email createdAt teachers')
      .lean();
  }

  /**
   * 🔎 Search teachers and students by name/email
   */
  async searchUsers(search?: string) {
    const searchFilter = this.buildUserSearchFilter(search, false);

    const [teachers, students] = await Promise.all([
      this.userModel
        .find({ role: 'TEACHER', ...searchFilter })
        .select('firstName lastName email createdAt students')
        .lean(),
      this.userModel
        .find({ role: 'STUDENT', ...searchFilter })
        .select('firstName lastName email createdAt teachers')
        .lean(),
    ]);

    return { teachers, students };
  }

  async getInactiveUsers(search?: string) {
    const searchFilter = this.buildUserSearchFilter(search, true);

    const users = await this.userModel
      .find(searchFilter)
      .select('firstName lastName name email role createdAt deactivatedAt')
      .sort({ deactivatedAt: -1, createdAt: -1 })
      .lean();

    return { users };
  }
  /**
   * 👑 Update user role (Admin only)
   */
  async updateUserRole(
    userId: string,
    role: string,
    actorAdminId?: string,
    actorAdminEmail?: string,
  ) {
    // Basic validation
    if (role !== 'STUDENT' && role !== 'TEACHER') {
       throw new Error('Invalid role. Only STUDENT or TEACHER allowed via this API.');
    }

    const existingUser = await this.userModel.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const previousRole = existingUser.role;
    existingUser.role = role as UserRole;
    const user = await existingUser.save();

    const { appName, appLogoUrl, webUrl } = this.emailSender.getBranding();
    let roleEmailNotice = '';

    if (previousRole !== 'TEACHER' && role === 'TEACHER' && user.email) {
      const adminUser = actorAdminId
        ? await this.userModel.findById(actorAdminId).select('firstName lastName name email').lean()
        : null;
      const adminDisplayName =
        [adminUser?.firstName, adminUser?.lastName].filter(Boolean).join(' ').trim() ||
        adminUser?.name ||
        'Admin';
      const targetName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        user.name ||
        'Teacher';

      const promotedMailSent = await this.sendTeacherPromotionEmail({
        teacherEmail: user.email,
        teacherName: targetName,
        adminName: adminDisplayName,
        appName,
        appLogoUrl,
        webUrl,
      });

      const adminEmail = actorAdminEmail || adminUser?.email;
      let adminAuditSent = false;
      if (adminEmail) {
        adminAuditSent = await this.sendAdminRoleUpdateEmail({
          adminEmail,
          adminName: adminDisplayName,
          targetName,
          updatedRole: role,
          appName,
          appLogoUrl,
          webUrl,
        });
      }

      roleEmailNotice = promotedMailSent
        ? `Promotion email sent to ${user.email}${adminEmail ? adminAuditSent ? ` and audit email sent to ${adminEmail}` : `, but failed to send audit email to ${adminEmail}` : ''}`
        : `Role updated, but failed to send promotion email to ${user.email}`;
    }

    // Clear cache might be needed if you cache user details by ID
    // For now, let's just ensure we return success
    
    // If we had a specific user cache key, we'd delete it here:
    // await redis.del(`user:${userId}`);

    return {
      success: true,
      message: `User role updated to ${role}`,
      emailNotice: roleEmailNotice || 'No role email sent',
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    };
  }

  async setUserActiveState(
    userId: string,
    isActive: boolean,
    actorAdminId?: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (actorAdminId && user._id.toString() === actorAdminId.toString()) {
      throw new BadRequestException('Admin cannot deactivate their own account');
    }

    if (user.isActive === isActive) {
      return {
        success: true,
        message: `User already ${isActive ? 'active' : 'inactive'}`,
        user: {
          _id: user._id,
          role: user.role,
          email: user.email,
          isActive: user.isActive,
          deactivatedAt: user.deactivatedAt || null,
        },
      };
    }

    user.isActive = isActive;
    user.deactivatedAt = isActive ? undefined : new Date();
    await user.save();

    return {
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt || null,
      },
    };
  }

  async notifyAssociatedStudentsAboutPublishedQuiz(input: {
    teacherId: string;
    quizTitle: string;
    difficulty?: string;
  }) {
    if (!Types.ObjectId.isValid(input.teacherId)) {
      throw new BadRequestException('Invalid teacher id');
    }

    const teacher = await this.userModel
      .findById(input.teacherId)
      .select('role firstName lastName name students')
      .lean();

    if (!teacher || teacher.role !== UserRole.TEACHER) {
      return {
        success: true,
        totalRecipients: 0,
        sent: 0,
        failed: 0,
        message: 'Notification skipped: creator is not a teacher',
      };
    }

    const studentIds = Array.isArray(teacher.students)
      ? teacher.students.map((id) => id.toString())
      : [];

    if (studentIds.length === 0) {
      return {
        success: true,
        totalRecipients: 0,
        sent: 0,
        failed: 0,
        message: 'No associated students found',
      };
    }

    const students = await this.userModel
      .find({
        _id: { $in: studentIds.map((id) => new Types.ObjectId(id)) },
        role: UserRole.STUDENT,
        isActive: { $ne: false },
        email: { $exists: true, $ne: null },
      })
      .select('firstName lastName name email')
      .lean();

    if (students.length === 0) {
      return {
        success: true,
        totalRecipients: 0,
        sent: 0,
        failed: 0,
        message: 'No active student email recipients found',
      };
    }

    const { appName, appLogoUrl, webUrl } = this.emailSender.getBranding();
    const teacherName =
      [teacher.firstName, teacher.lastName].filter(Boolean).join(' ').trim() ||
      teacher.name ||
      'Your Teacher';

    let sent = 0;
    let failed = 0;
    const batchSize = 20;

    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (student) => {
          const studentName =
            [student.firstName, student.lastName].filter(Boolean).join(' ').trim() ||
            student.name ||
            'Student';

          const template = buildQuizPublishedForStudentTemplate({
            appName,
            appLogoUrl,
            webUrl,
            studentName,
            teacherName,
            quizTitle: input.quizTitle,
            difficulty: input.difficulty,
          });

          return this.sendTemplatedEmail(student.email || '', template, appName);
        }),
      );

      for (const ok of results) {
        if (ok) sent += 1;
        else failed += 1;
      }
    }

    return {
      success: true,
      totalRecipients: students.length,
      sent,
      failed,
      message: failed
        ? `Notification sent with partial failures (${sent}/${students.length})`
        : `Notification sent to all associated students (${sent})`,
    };
  }

  private async sendStudentAddedEmail(data: {
    studentEmail: string;
    studentName: string;
    teacherName: string;
    teacherEmail?: string;
    appName: string;
    appLogoUrl?: string;
    webUrl?: string;
  }) {
    const template = buildStudentAddedByTeacherTemplate({
      appName: data.appName,
      appLogoUrl: data.appLogoUrl,
      webUrl: data.webUrl,
      studentName: data.studentName,
      teacherName: data.teacherName,
      teacherEmail: data.teacherEmail,
    });

    return this.sendTemplatedEmail(data.studentEmail, template, data.appName);
  }

  private async sendTeacherPromotionEmail(data: {
    teacherEmail: string;
    teacherName: string;
    adminName: string;
    appName: string;
    appLogoUrl?: string;
    webUrl?: string;
  }) {
    const template = buildTeacherPromotionTemplate({
      appName: data.appName,
      appLogoUrl: data.appLogoUrl,
      webUrl: data.webUrl,
      teacherName: data.teacherName,
      adminName: data.adminName,
    });

    return this.sendTemplatedEmail(data.teacherEmail, template, data.appName);
  }

  private async sendAdminRoleUpdateEmail(data: {
    adminEmail: string;
    adminName: string;
    targetName: string;
    updatedRole: string;
    appName: string;
    appLogoUrl?: string;
    webUrl?: string;
  }) {
    const template = buildAdminRoleUpdateTemplate({
      appName: data.appName,
      appLogoUrl: data.appLogoUrl,
      webUrl: data.webUrl,
      adminName: data.adminName,
      targetName: data.targetName,
      updatedRole: data.updatedRole,
    });

    return this.sendTemplatedEmail(data.adminEmail, template, data.appName);
  }

  private async sendTemplatedEmail(
    to: string,
    template: EmailTemplate,
    appName: string,
  ): Promise<boolean> {
    return this.emailSender.sendTemplatedEmail(to, template, appName);
  }

  private buildUserSearchFilter(search?: string, inactiveOnly = false) {
    const statusFilter = inactiveOnly ? { isActive: false } : { isActive: { $ne: false } };
    const term = search?.trim();
    if (!term) return statusFilter;

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    return {
      ...statusFilter,
      $or: [{ firstName: regex }, { lastName: regex }, { name: regex }, { email: regex }],
    };
  }

}
