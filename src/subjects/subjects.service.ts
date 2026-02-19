import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Subject, SubjectDocument } from './subject.schema';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ListSubjectsDto } from './dto/list-subjects.dto';
import { redis } from 'src/redis/redis.provider';

@Injectable()
export class SubjectsService {
  private readonly PRIMARY_SUBJECTS_CACHE_KEY = 'subjects:primary:v1';
  private readonly PRIMARY_SUBJECTS_CACHE_TTL_SECONDS = 86400;
  private readonly PRIMARY_SUBJECTS_LIMIT = 5;

  constructor(
    @InjectModel(Subject.name)
    private readonly subjectModel: Model<SubjectDocument>,
  ) {}

  // ➕ Create Subject
  async create(dto: CreateSubjectDto & { logoUrl?: string }) {
    const exists = await this.subjectModel.findOne({
      name: dto.name,
      isActive: true,
    });

    if (exists) {
      throw new BadRequestException('Subject with this name already exists');
    }

    const subject = await this.subjectModel.create(dto);
    await this.invalidateSubjectCaches();

    return {
      success: true,
      message: 'Subject created successfully',
      data: subject,
    };
  }


  // 📄 Get All Active Subjects
  async findAll(query: ListSubjectsDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const filter: any = { isActive: true };

    if (query.type) {
      filter.type = query.type;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
        { subjectClass: regex },
      ];
    }

    const [subjects, total] = await Promise.all([
      this.subjectModel
        .find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.subjectModel.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      success: true,
      message: 'Subjects fetched successfully',
      data: subjects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // 📄 Get All Primary Subjects
  async findPrimarySubjects() {
    const cached = await this.getPrimarySubjectsCache();
    if (cached) {
      return {
        success: true,
        message: 'Primary subjects fetched successfully (cache)',
        data: cached,
      };
    }

    const subjects = await this.subjectModel
      .find({
        isActive: true,
        isPrimary: true,
        priority: { $gte: 0 },
      })
      .sort({ priority: 1, createdAt: -1 })
      .limit(this.PRIMARY_SUBJECTS_LIMIT)
      .lean();

    await this.setPrimarySubjectsCache(subjects);

    return {
      success: true,
      message: 'Primary subjects fetched successfully',
      data: subjects,
    };
  }

  // 🔍 Get Subject by ID
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid subject id');
    }

    const subject = await this.subjectModel.findOne({
      _id: id,
      isActive: true,
    }).lean();

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return {
      success: true,
      message: 'Subject fetched successfully',
      data: subject,
    };
  }

  // ✏️ Update Subject
  async update(id: string, dto: UpdateSubjectDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid subject id');
    }

    if (dto.name) {
      const exists = await this.subjectModel.findOne({
        name: dto.name,
        _id: { $ne: id },
        isActive: true,
      });

      if (exists) {
        throw new BadRequestException(
          'Another subject with this name already exists',
        );
      }
    }

    const updatedSubject = await this.subjectModel.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: dto },
      { new: true },
    );

    if (!updatedSubject) {
      throw new NotFoundException('Subject not found or inactive');
    }
    await this.invalidateSubjectCaches();

    return {
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  // 🗑️ Soft Delete Subject
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid subject id');
    }

    const deletedSubject = await this.subjectModel.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!deletedSubject) {
      throw new NotFoundException('Subject not found or already deleted');
    }
    await this.invalidateSubjectCaches();

    return {
      success: true,
      message: 'Subject deleted successfully',
      data: null,
    };
  }

  private async getPrimarySubjectsCache(): Promise<any[] | null> {
    try {
      const raw = await redis.get(this.PRIMARY_SUBJECTS_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async setPrimarySubjectsCache(subjects: any[]): Promise<void> {
    try {
      await redis.set(
        this.PRIMARY_SUBJECTS_CACHE_KEY,
        JSON.stringify(subjects),
        'EX',
        this.PRIMARY_SUBJECTS_CACHE_TTL_SECONDS,
      );
    } catch {
      // Cache write should not break API response
    }
  }

  private async invalidateSubjectCaches(): Promise<void> {
    try {
      await redis.del(this.PRIMARY_SUBJECTS_CACHE_KEY);
    } catch {
      // Cache invalidation failure should not block mutations
    }
  }
}
