import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subject, SubjectDocument } from './subject.schema';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name)
    private readonly subjectModel: Model<SubjectDocument>,
  ) {}

  // ➕ Create Subject
  async create(data: Partial<Subject>) {
    return await this.subjectModel.create(data);
  }

  // 📄 Get All Active Subjects
  async findAll() {
    return await this.subjectModel.find({ isActive: true }).sort({ createdAt: -1 });
  }

  // 🔍 Get Subject by ID
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid subject id');
    }

    const subject = await this.subjectModel.findById(id);
    if (!subject || !subject.isActive) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  // ✏️ Update Subject
  async update(id: string, data: Partial<Subject>) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid subject id');
    }

    const updatedSubject = await this.subjectModel.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: data },
      { new: true },
    );

    if (!updatedSubject) {
      throw new NotFoundException('Subject not found or inactive');
    }

    return updatedSubject;
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

    return {
      success: true,
      message: 'Subject deleted successfully',
    };
  }
}
