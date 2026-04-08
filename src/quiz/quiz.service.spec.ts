/// <reference types="jest" />
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { QuizService } from './quiz.service';
import { Role } from '../auth/role/roles.enum';

describe('QuizService (notification helpers)', () => {
  let service: QuizService;
  let userService: any;
  let quizModel: any;

  const teacherId = new Types.ObjectId().toString();
  const otherTeacherId = new Types.ObjectId().toString();

  beforeEach(() => {
    userService = {
      notifyAssociatedStudentsAboutPublishedQuiz: jest.fn().mockResolvedValue({
        success: true,
        totalRecipients: 1,
        sent: 1,
        failed: 0,
      }),
    };

    quizModel = {
      findById: jest.fn(),
      updateOne: jest.fn(),
    };

    service = new QuizService(userService, quizModel);
  });

  it('throws when quiz not found', async () => {
    quizModel.findById.mockResolvedValue(null);
    await expect(
      service.notifyStudentsForPublishedQuiz('id', teacherId, Role.TEACHER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('skips if quiz not published', async () => {
    quizModel.findById.mockResolvedValue({ status: 'draft' });
    await expect(
      service.notifyStudentsForPublishedQuiz('id', teacherId, Role.TEACHER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only teacher or admin can trigger', async () => {
    quizModel.findById.mockResolvedValue({ status: 'published' });
    await expect(
      service.notifyStudentsForPublishedQuiz('id', teacherId, 'STUDENT'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('filters out already notified students when sendToAll=false', async () => {
    const student1 = new Types.ObjectId();
    const student2 = new Types.ObjectId();

    quizModel.findById.mockResolvedValue({
      status: 'published',
      createdBy: new Types.ObjectId(teacherId),
      visibility: 'RESTRICTED',
      allowedUserIds: [student1, student2],
      notifiedStudentIds: [student1],
    });

    await service.notifyStudentsForPublishedQuiz('id', teacherId, Role.TEACHER);

    expect(userService.notifyAssociatedStudentsAboutPublishedQuiz).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: expect.any(String),
        studentIds: [student2.toString()],
      }),
    );
    expect(quizModel.updateOne).toHaveBeenCalledWith(
      { _id: 'id' },
      expect.objectContaining({
        notifiedStudentIds: expect.any(Array),
        lastNotifiedAt: expect.any(Date),
      }),
    );
  });

  it('sends to everyone when sendToAll=true', async () => {
    const student1 = new Types.ObjectId();
    const student2 = new Types.ObjectId();

    quizModel.findById.mockResolvedValue({
      status: 'published',
      createdBy: new Types.ObjectId(teacherId),
      visibility: 'RESTRICTED',
      allowedUserIds: [student1, student2],
      notifiedStudentIds: [student1],
    });

    await service.notifyStudentsForPublishedQuiz('id', teacherId, Role.TEACHER, true);

    expect(userService.notifyAssociatedStudentsAboutPublishedQuiz).toHaveBeenCalledWith(
      expect.objectContaining({
        studentIds: [student1.toString(), student2.toString()],
      }),
    );

    // update should also include both ids
    expect(quizModel.updateOne).toHaveBeenCalledWith(
      { _id: 'id' },
      expect.objectContaining({
        notifiedStudentIds: expect.arrayContaining([
          new Types.ObjectId(student1).toString(),
          new Types.ObjectId(student2).toString(),
        ]),
        lastNotifiedAt: expect.any(Date),
      }),
    );
  });

  it('includes students resolved from batch ids', async () => {
    const batchStudent = 'batch-student-id';
    // spy on helper
    userService.getActiveStudentIdsInBatches = jest.fn().mockResolvedValue([batchStudent]);

    quizModel.findById.mockResolvedValue({
      status: 'published',
      createdBy: new Types.ObjectId(teacherId),
      visibility: 'RESTRICTED',
      allowedUserIds: [],
      allowedBatchIds: [new Types.ObjectId('507f1f77bcf86cd799439011')],
      notifiedStudentIds: [],
    });

    await service.notifyStudentsForPublishedQuiz('id', teacherId, Role.TEACHER);

    expect(userService.getActiveStudentIdsInBatches).toHaveBeenCalledWith([
      '507f1f77bcf86cd799439011',
    ]);
    expect(userService.notifyAssociatedStudentsAboutPublishedQuiz).toHaveBeenCalledWith(
      expect.objectContaining({
        studentIds: [batchStudent],
      }),
    );
  });
});
