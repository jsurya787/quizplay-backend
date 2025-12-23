import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chapter, ChapterDocument } from './chapter.schema';
import { SubjectsService } from '../subjects/subjects.service';
import { Types } from 'mongoose';

@Injectable()
export class ChaptersService {
  constructor(
    @InjectModel(Chapter.name)
    private chapterModel: Model<ChapterDocument>,
    private subjectsService: SubjectsService,
  ) {}



async create(data: Partial<Chapter>) {
  if (!data.subject) {
    throw new BadRequestException('Subject is required');
  }

  const subjectId =
    data.subject instanceof Types.ObjectId
      ? data.subject.toString()
      : data.subject;

  const subject = await this.subjectsService.findById(subjectId);

  if (!subject) {
    throw new NotFoundException('Subject not found');
  }

  const chapter = await this.chapterModel.findOne({ title: data.title });

  if (chapter) {
    throw new BadRequestException('Chapter already exists');
  }

  return this.chapterModel.create({
    ...data,
    subject: new Types.ObjectId(subjectId),
  });
}


  findBySubject(subjectId: string) {
    return this.chapterModel
      .find({ subject: subjectId })
      .sort({ order: 1 });
  }

findAll() {
    return this.chapterModel
        .find({})
        .sort({ order: 1 });
}
findById(chapterId: string){
    return this.chapterModel.findById(chapterId);

}
}
