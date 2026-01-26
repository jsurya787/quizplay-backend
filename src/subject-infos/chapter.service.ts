import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chapter } from './chapter.schema';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class ChapterService {
  constructor(
    @InjectModel(Chapter.name)
    private model: Model<Chapter>,
  ) {}



    async findByChapter(chapterId: string) {
    if (!Types.ObjectId.isValid(chapterId)) {
        return {
        success: false,
        message: 'Invalid chapter id',
        data: null,
        };
    }

    const chapter = await this.model.findOne({
        _id: chapterId,
        isActive: true,
    });

    if (!chapter) {
        return {
        success: false,
        message: 'Chapter not found',
        data: null,
        };
    }

    return {
        success: true,
        message: 'Chapter fetched successfully',
        data: chapter,
    };
    }


  async create(dto: CreateChapterDto) {
    const chapter = await this.model.create(dto);

    return {
      success: true,
      message: 'Chapter created successfully',
      data: chapter,
    };
  }

  async findBySubject(subjectId: string) {
    const chapters = await this.model
      .find({ subjectId, isActive: true })
      .sort({ order: 1 });

    return {
      success: true,
      message: 'Chapters fetched successfully',
      data: chapters,
    };
  }

  async delete(chapterId: string) {
    const deletedChapter = await this.model.findByIdAndDelete(chapterId);

    if (!deletedChapter) {
      return {
        success: false,
        message: 'Chapter not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Chapter deleted successfully',
      data: deletedChapter,
    };
  }

  async updateChapter(chapterId: string, dto: UpdateChapterDto) {
    const updatedChapter = await this.model.findByIdAndUpdate(
      chapterId,
      { $set: dto },
      { new: true },
    );

    if (!updatedChapter) {
      return {
        success: false,
        message: 'Chapter not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Chapter updated successfully',
      data: updatedChapter,
    };
  }

async addSectionToChapter(
  chapterId: string,
  dto: CreateSectionDto,
) {
  const updatedChapter = await this.model.findByIdAndUpdate(
    chapterId,
    {
      $push: {
        sections: {
          ...dto,
          isActive: dto.isActive ?? true,
        },
      },
    },
    { new: true },
  );

  if (!updatedChapter) {
    return {
      success: false,
      message: 'Chapter not found',
      data: null,
    };
  }

  return {
    success: true,
    message: 'Section added successfully', 
    data: updatedChapter,
  };
}



async updateSectionToChapter(
  chapterId: string,
  sectionId: string,
  dto: CreateSectionDto & { _id?: string },
) {
  // 🔥 Explicitly remove _id
  const { _id, ...safeDto } = dto;

  const updatedChapter = await this.model.findOneAndUpdate(
    {
      _id: chapterId,
      'sections._id': sectionId,
    },
    {
      $set: {
        'sections.$.title': safeDto.title,
        'sections.$.content': safeDto.content,
        'sections.$.type': safeDto.type,
        'sections.$.order': safeDto.order,
        'sections.$.isActive': safeDto.isActive ?? true,
      },
    },
    { new: true },
  );

  if (!updatedChapter) {
    return {
      success: false,
      message: 'Chapter or section not found',
      data: null,
    };
  }

  return {
    success: true,
    message: 'Section updated successfully',
    data: updatedChapter,
  };
}





async deleteSectionFromChapter(
  chapterId: string,
  sectionId: string,
) {
  const updatedChapter = await this.model.findByIdAndUpdate(
    chapterId,
    {
      $pull: {
        sections: { _id: sectionId },
      },
    },
    { new: true },
  );

  if (!updatedChapter) {
    return {
      success: false,
      message: 'Chapter not found',
      data: null,
    };
  }

  return {
    success: true,
    message: 'Section deleted successfully',
    data: updatedChapter,
  };
}



}