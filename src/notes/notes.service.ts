import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './notes.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name)
    private readonly noteModel: Model<NoteDocument>,
  ) {}

  // ================= CREATE =================
  async create(userId: string, dto: CreateNoteDto) {
    const note = await this.noteModel.create({
      userId: new Types.ObjectId(userId),
      title: dto.title ?? '',
      content: dto.content ?? '',
    });

    return {
      status: true,
      message: 'Note created successfully',
      data: note,
    };
  }

  // ================= LIST =================
  async findAll(userId: string, search?: string) {
    const filter: any = {
      userId: new Types.ObjectId(userId),
      isActive: true,
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const notes = await this.noteModel
      .find(filter)
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    return {
      status: true,
      message: 'Notes fetched successfully',
      data: notes,
    };
  }

  // ================= GET ONE =================
  async findOne(noteId: string, userId: string) {
    const note = await this.noteModel.findOne({
      _id: noteId,
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!note) {
      throw new NotFoundException({
        status: false,
        message: 'Note not found',
      });
    }

    return {
      status: true,
      message: 'Note fetched successfully',
      data: note,
    };
  }

  // ================= UPDATE =================
  async update(noteId: string, userId: string, dto: UpdateNoteDto) {
    const note = await this.noteModel.findOneAndUpdate(
      { _id: noteId, userId: new Types.ObjectId(userId) },
      dto,
      { new: true },
    );

    if (!note) {
      throw new NotFoundException({
        status: false,
        message: 'Note not found',
      });
    }

    return {
      status: true,
      message: 'Note updated successfully',
      data: note,
    };
  }

  // ================= DELETE (SOFT) =================
  async delete(noteId: string, userId: string) {
    const note = await this.noteModel.findOneAndUpdate(
      { _id: noteId, userId: new Types.ObjectId(userId) },
      { isActive: false },
      { new: true },
    );

    if (!note) {
      throw new NotFoundException({
        status: false,
        message: 'Note not found',
      });
    }

    return {
      status: true,
      message: 'Note deleted successfully',
      data: null,
    };
  }
}
