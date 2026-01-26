import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubjectInfo } from './subject-info.schema';
import { Quiz } from '../quiz/quiz.schema';
import { CreateSubjectInfoDto } from './dto/create-subject-info.dto';
import { Chapter } from './chapter.schema'; // ✅ import chapter schema
import { Subject } from 'src/subjects/subject.schema';

@Injectable()
export class SubjectInfoService {
  constructor(
    @InjectModel(SubjectInfo.name)
    private subjectInfoModel: Model<SubjectInfo>,

    @InjectModel(Quiz.name)
    private quizModel: Model<Quiz>, // ✅ inject quiz model

    @InjectModel(Chapter.name)
    private chapterModel: Model<Chapter>, // ✅ inject chapter model

    @InjectModel(Subject.name)
    private subjectModel: Model<Subject>, // ✅ inject chapter model
  ) {}

  // =========================
  // CREATE / UPDATE (UPSERT)
  // =========================
  async upsert(dto: CreateSubjectInfoDto) {
    const existingSubject = await this.subjectInfoModel.findOne({
      subjectId: dto.subjectId,
    });

    if (existingSubject) {
      const updatedSubject = await this.subjectInfoModel.findOneAndUpdate(
        { subjectId: dto.subjectId },
        { $set: dto },
        { new: true },
      );

      return {
        success: true,
        message: 'Subject updated successfully',
        data: updatedSubject,
      };
    }

    const createdSubject = new this.subjectInfoModel(dto);
    const savedSubject = await createdSubject.save();

    return {
      success: true,
      message: 'Subject created successfully',
      data: savedSubject,
    };
  }

  // =========================
  // GET SUBJECT INFO
  // =========================
  async findBySubject(subjectId: string) {
    const subject = await this.subjectInfoModel.findOne({
      subjectId,
      //isActive: true,
    });

    if (!subject) {
      return {
        success: false,
        message: 'Subject not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Subject fetched successfully',
      data: subject,
    };
  }

  // =========================
  // ⭐ ONE-CALL SUBJECT PAGE
  // =========================
async getSubjectPage(subjectId: string) {
  try {
    const [subject, subjectInfo, chapters, quizzes] = await Promise.all([
      // 1️⃣ Subject basic info
      this.subjectModel
        .findById(subjectId)
        .select('name description')
        .lean(),

      // 2️⃣ Subject extra info
      this.subjectInfoModel
        .findOne({ subjectId })
        .lean(),

      // 3️⃣ Chapters (🚀 sections REMOVED)
      this.chapterModel
        .find({ subjectId, isActive: true })
        .select('-sections') // ✅ THIS LINE
        .sort({ order: 1 })
        .lean(),

      // 4️⃣ Latest 2 quizzes
      this.quizModel
        .find({
          subjectId,
          isActive: true,
          status: 'published',
        })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
    ]);

    if (!subject) {
      return {
        success: false,
        message: 'Subject not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Subject page data fetched successfully',
      data: {
        subject,
        subjectInfo,
        chapters, // 🚀 lightweight chapters
        quizzes,
      },
    };
  } catch (error) {
    console.error('getSubjectPage error:', error);

    return {
      success: false,
      message: 'Failed to fetch subject page',
      data: null,
    };
  }
}



}
