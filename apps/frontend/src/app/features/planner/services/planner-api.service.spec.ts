import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PlannerDay } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { PlannerApiService } from './planner-api.service';

describe('PlannerApiService', () => {
  let service: PlannerApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/planner`;

  const mockDay: PlannerDay = {
    id: 'day-1',
    date: '2026-07-03',
    notes: null,
    blocks: [],
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlannerApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('today() requests /planner/today', () => {
    service.today().subscribe((day) => expect(day).toEqual(mockDay));
    httpMock.expectOne(`${baseUrl}/today`).flush(mockDay);
  });

  it('getByDate() requests /planner/:date', () => {
    service.getByDate('2026-07-03').subscribe((day) => expect(day).toEqual(mockDay));
    httpMock.expectOne(`${baseUrl}/2026-07-03`).flush(mockDay);
  });

  it('createBlock() posts to /planner/block', () => {
    const request = { type: 'FOCUS' as const, title: 'Deep work', startTime: 'a', endTime: 'b' };
    service.createBlock(request).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/block`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(request);
    req.flush(mockDay);
  });

  it('updateBlock() patches /planner/block/:id', () => {
    service.updateBlock('block-1', { title: 'Updated' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/block/block-1`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockDay);
  });

  it('removeBlock() deletes /planner/block/:id', () => {
    service.removeBlock('block-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/block/block-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('generate() posts to /planner/generate', () => {
    service.generate({ date: '2026-07-03' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/generate`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockDay, unscheduledTaskIds: [], unscheduledHabitIds: [] });
  });

  it('reorder() posts to /planner/reorder', () => {
    service.reorder({ date: '2026-07-03', blockIds: ['a', 'b'] }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ date: '2026-07-03', blockIds: ['a', 'b'] });
    req.flush(mockDay);
  });

  it('complete() posts to /planner/complete', () => {
    service.complete({ blockId: 'block-1' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/complete`);
    expect(req.request.method).toBe('POST');
    req.flush(mockDay);
  });
});
