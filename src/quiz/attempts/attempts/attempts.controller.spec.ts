import { Test, TestingModule } from '@nestjs/testing';
import { AttemptsController } from './attempts.controller';

describe('AttemptsController', () => {
  let controller: AttemptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttemptsController],
    }).compile();

    controller = module.get<AttemptsController>(AttemptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
