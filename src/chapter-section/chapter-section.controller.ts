import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ChapterSectionsService } from './chapter-section.service';
import { ChapterSection } from './chapter-section.schema';

@Controller()
export class ChapterSectionsController {
  constructor(
    private readonly chapterSectionsService: ChapterSectionsService,
  ) {}

  /**
   * Create a section inside a chapter
   * POST /chapters/:chapterId/sections
   */
  @Post('chapters/:chapterId/sections')
  create(
    @Param('chapterId') chapterId: string,
    @Body() body: Partial<ChapterSection>,
  ) {
    return this.chapterSectionsService.create(chapterId, body);
  }

  /**
   * Get all sections of a chapter
   * GET /chapters/:chapterId/sections
   */
  @Get('chapters/:chapterId/sections')
  findByChapter(@Param('chapterId') chapterId: string) {
    return this.chapterSectionsService.findByChapter(chapterId);
  }

  /**
   * Get single section
   * GET /chapter-sections/:id
   */
  @Get('chapter-sections/:id')
  findOne(@Param('id') id: string) {
    return this.chapterSectionsService.findById(id);
  }

  /**
   * Update a section
   * PATCH /chapter-sections/:id
   */
  @Patch('chapter-sections/:id')
  update(@Param('id') id: string, @Body() body: Partial<ChapterSection>) {
    return this.chapterSectionsService.update(id, body);
  }

  /**
   * Delete a section
   * DELETE /chapter-sections/:id
   */
  @Delete('chapter-sections/:id')
  remove(@Param('id') id: string) {
    return this.chapterSectionsService.remove(id);
  }

  /**
   * Reorder sections in a chapter
   * PUT /chapters/:chapterId/sections/reorder
   */
  @Put('chapters/:chapterId/sections/reorder')
  reorder(
    @Param('chapterId') chapterId: string,
    @Body()
    body: { sectionId: string; order: number }[],
  ) {
    return this.chapterSectionsService.reorder(chapterId, body);
  }
}
