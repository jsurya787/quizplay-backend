import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChapterSection,
  SectionType,
} from './chapter-section.schema';
import { ChaptersService } from '../chapters/chapters.service';

@Injectable()
export class ChapterSectionsService {
  constructor(
    @InjectModel(ChapterSection.name)
    private readonly sectionModel: Model<ChapterSection>,
    private readonly chaptersService: ChaptersService,
  ) {}

  /**
   * Create a new section inside a chapter
   */
  async create(chapterId: string, data: Partial<ChapterSection>) {
    if (!Types.ObjectId.isValid(chapterId)) {
      throw new BadRequestException('Invalid chapter id');
    }

    const chapter = await this.chaptersService.findById(chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    if (!data.type || !Object.values(SectionType).includes(data.type)) {
      throw new BadRequestException('Invalid section type');
    }

    return this.sectionModel.create({
      ...data,
      chapter: new Types.ObjectId(chapterId),
    });
  }

  /**
   * Get all sections of a chapter (ordered)
   */
  async findByChapter(chapterId: string) {
    if (!Types.ObjectId.isValid(chapterId)) {
      throw new BadRequestException('Invalid chapter id');
    }

    return this.sectionModel
      .find({ chapter: chapterId })
      .sort({ order: 1 })
      .lean();
  }

  /**
   * Get single section by id
   */
  async findById(sectionId: string) {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestException('Invalid section id');
    }

    const section = await this.sectionModel.findById(sectionId);
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  /**
   * Update section content
   */
  async update(sectionId: string, data: Partial<ChapterSection>) {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestException('Invalid section id');
    }

    const updated = await this.sectionModel.findByIdAndUpdate(
      sectionId,
      { $set: data },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Section not found');
    }

    return updated;
  }

  /**
   * Delete a section
   */
  async remove(sectionId: string) {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestException('Invalid section id');
    }

    const deleted = await this.sectionModel.findByIdAndDelete(sectionId);
    if (!deleted) {
      throw new NotFoundException('Section not found');
    }

    return { message: 'Section deleted successfully' };
  }

  /**
   * Reorder sections in a chapter
   */
  async reorder(
    chapterId: string,
    sectionOrders: { sectionId: string; order: number }[],
  ) {
    if (!Types.ObjectId.isValid(chapterId)) {
      throw new BadRequestException('Invalid chapter id');
    }

    const bulkOps = sectionOrders.map(({ sectionId, order }) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(sectionId),
          chapter: new Types.ObjectId(chapterId),
        },
        update: { $set: { order } },
      },
    }));

    await this.sectionModel.bulkWrite(bulkOps);

    return { message: 'Sections reordered successfully' };
  }
}
