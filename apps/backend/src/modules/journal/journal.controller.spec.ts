import { Test, TestingModule } from '@nestjs/testing';
import { JournalType } from '../../../generated/prisma/index.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { JournalController } from './journal.controller.js';
import { JournalService } from './journal.service.js';

describe('JournalController', () => {
  let controller: JournalController;
  let journalService: {
    findAll: jest.Mock;
    history: jest.Mock;
    search: jest.Mock;
    getPrompts: jest.Mock;
    getByDate: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    addAttachment: jest.Mock;
    removeAttachment: jest.Mock;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  beforeEach(async () => {
    journalService = {
      findAll: jest.fn(),
      history: jest.fn(),
      search: jest.fn(),
      getPrompts: jest.fn(),
      getByDate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addAttachment: jest.fn(),
      removeAttachment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JournalController],
      providers: [{ provide: JournalService, useValue: journalService }],
    }).compile();

    controller = module.get(JournalController);
  });

  it('findAll delegates to JournalService.findAll with the requesting user', async () => {
    journalService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(currentUser, {});

    expect(journalService.findAll).toHaveBeenCalledWith(currentUser.id, {});
  });

  it('history delegates to JournalService.history', async () => {
    journalService.history.mockResolvedValue({ data: [], meta: {} });

    await controller.history(currentUser, { dateFrom: '2026-06-01' });

    expect(journalService.history).toHaveBeenCalledWith(currentUser.id, {
      dateFrom: '2026-06-01',
    });
  });

  it('search delegates to JournalService.search', async () => {
    journalService.search.mockResolvedValue({ data: [], meta: {} });

    await controller.search(currentUser, { keyword: 'gratitude' });

    expect(journalService.search).toHaveBeenCalledWith(currentUser.id, {
      keyword: 'gratitude',
    });
  });

  it('getPrompts delegates to JournalService.getPrompts with the type filter', async () => {
    journalService.getPrompts.mockResolvedValue([]);

    await controller.getPrompts({ type: JournalType.MORNING });

    expect(journalService.getPrompts).toHaveBeenCalledWith(JournalType.MORNING);
  });

  it('getByDate delegates to JournalService.getByDate', async () => {
    journalService.getByDate.mockResolvedValue({
      date: '2026-07-04',
      entries: [],
    });

    await controller.getByDate(currentUser, '2026-07-04');

    expect(journalService.getByDate).toHaveBeenCalledWith(
      currentUser.id,
      '2026-07-04',
    );
  });

  it('create delegates to JournalService.create', async () => {
    const dto = { type: JournalType.FREEFORM };
    journalService.create.mockResolvedValue({ id: 'entry-1' });

    await controller.create(currentUser, dto);

    expect(journalService.create).toHaveBeenCalledWith(currentUser.id, dto);
  });

  it('update delegates to JournalService.update', async () => {
    const dto = { title: 'Updated' };
    journalService.update.mockResolvedValue({ id: 'entry-1' });

    await controller.update(currentUser, 'entry-1', dto);

    expect(journalService.update).toHaveBeenCalledWith(
      currentUser.id,
      'entry-1',
      dto,
    );
  });

  it('remove delegates to JournalService.remove', async () => {
    journalService.remove.mockResolvedValue(undefined);

    await controller.remove(currentUser, 'entry-1');

    expect(journalService.remove).toHaveBeenCalledWith(
      currentUser.id,
      'entry-1',
    );
  });

  it('addAttachment delegates to JournalService.addAttachment', async () => {
    const dto = {
      journalId: 'entry-1',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024,
      url: 'https://cdn.example.com/photo.jpg',
    };
    journalService.addAttachment.mockResolvedValue({ id: 'attachment-1' });

    await controller.addAttachment(currentUser, dto);

    expect(journalService.addAttachment).toHaveBeenCalledWith(
      currentUser.id,
      dto,
    );
  });

  it('removeAttachment delegates to JournalService.removeAttachment', async () => {
    journalService.removeAttachment.mockResolvedValue(undefined);

    await controller.removeAttachment(currentUser, 'attachment-1');

    expect(journalService.removeAttachment).toHaveBeenCalledWith(
      currentUser.id,
      'attachment-1',
    );
  });
});
