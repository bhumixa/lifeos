import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { JournalEntry } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { JournalApiService } from './journal-api.service';

describe('JournalApiService', () => {
  let service: JournalApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/journal`;

  const mockEntry: JournalEntry = {
    id: 'entry-1',
    date: '2026-07-04',
    type: 'FREEFORM',
    title: null,
    content: 'A normal day.',
    mood: null,
    energy: null,
    productivity: null,
    gratitude: [],
    wins: [],
    lessons: null,
    tomorrowPlan: null,
    tags: [],
    weather: null,
    location: null,
    intention: null,
    topPriorities: [],
    affirmation: null,
    visualization: null,
    expectedChallenges: null,
    wentWell: null,
    wentWrong: null,
    plannerReflection: null,
    habitReflection: null,
    goalReflection: null,
    goalId: null,
    plannerDayId: null,
    attachments: [],
    createdAt: '2026-07-04T08:00:00.000Z',
    updatedAt: '2026-07-04T08:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(JournalApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() requests the base journal URL with query params', () => {
    service.list({ type: 'MORNING' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('type')).toBe('MORNING');
    req.flush({ data: [mockEntry], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
  });

  it('history() requests GET /journal/history with a date range', () => {
    service.history({ dateFrom: '2026-06-01', dateTo: '2026-06-30' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/history`);
    expect(req.request.params.get('dateFrom')).toBe('2026-06-01');
    expect(req.request.params.get('dateTo')).toBe('2026-06-30');
    req.flush({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
  });

  it('search() requests GET /journal/search with the rich filter set', () => {
    service.search({ keyword: 'gratitude', mood: 'GOOD', tag: 'work' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/search`);
    expect(req.request.params.get('keyword')).toBe('gratitude');
    expect(req.request.params.get('mood')).toBe('GOOD');
    expect(req.request.params.get('tag')).toBe('work');
    req.flush({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
  });

  it('getPrompts() requests GET /journal/prompts, optionally filtered by type', () => {
    service.getPrompts('MORNING').subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/prompts`);
    expect(req.request.params.get('type')).toBe('MORNING');
    req.flush([]);
  });

  it('getByDate() requests the specific date', () => {
    service.getByDate('2026-07-04').subscribe((day) => expect(day.date).toBe('2026-07-04'));
    httpMock.expectOne(`${baseUrl}/2026-07-04`).flush({ date: '2026-07-04', entries: [mockEntry] });
  });

  it('create() posts to the base journal URL', () => {
    service.create({ type: 'FREEFORM' }).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush(mockEntry);
  });

  it('update() patches the specific entry', () => {
    service.update(mockEntry.id, { title: 'Updated' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockEntry.id}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockEntry);
  });

  it('remove() deletes the specific entry', () => {
    service.remove(mockEntry.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockEntry.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('addAttachment() posts to the attachments sub-resource', () => {
    service
      .addAttachment({
        journalId: mockEntry.id,
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        url: 'https://cdn.example.com/photo.jpg',
      })
      .subscribe();
    const req = httpMock.expectOne(`${baseUrl}/attachments`);
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 'attachment-1',
      journalId: mockEntry.id,
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024,
      url: 'https://cdn.example.com/photo.jpg',
      createdAt: '2026-07-04T08:00:00.000Z',
    });
  });

  it('removeAttachment() deletes the specific attachment', () => {
    service.removeAttachment('attachment-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/attachments/attachment-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
