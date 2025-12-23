import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subject, SubjectDocument } from './subject.schema';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name)
    private subjectModel: Model<SubjectDocument>,
  ) {}

  create(data: Partial<Subject>) {
    return this.subjectModel.create(data);
  }

  findAll() {
    return this.subjectModel.find({ isActive: true });
  }

  findById(id: string) {
    return this.subjectModel.findById(id);
  }
}
