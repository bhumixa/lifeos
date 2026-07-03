import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Goal, GoalMilestone } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { GoalApiService } from './goal-api.service';

describe('GoalApiService', () => {
  let service: GoalApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/goals`;

  const mockGoal: Goal = {
    id: 'goal-1',
    title: 'Run a half marathon',
    description: null,
    icon: 'flag',
    color: '#3F51B5',
    category: null,
    priority: 'MEDIUM',
    targetType: 'TASK_COUNT',
    targetValue: 10,
    currentValue: 0,
    progressPercent: 0,
    startDate: null,
    targetDate: null,
    status: 'NOT_STARTED',
    archived: false,
    milestones: [],
    milestonesCompletedCount: 0,
    milestonesTotalCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  const mockMilestone: GoalMilestone = {
    id: 'milestone-1',
    goalId: mockGoal.id,
    title: 'First checkpoint',
    description: null,
    dueDate: null,
    completed: false,
    completedAt: null,
    order: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoalApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() requests the base goals URL with query params', () => {
    service.list({ status: 'ACTIVE', archived: false }).subscribe();
    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('status')).toBe('ACTIVE');
    expect(req.request.params.get('archived')).toBe('false');
    req.flush({ data: [mockGoal], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
  });

  it('getById() requests the specific goal', () => {
    service.getById(mockGoal.id).subscribe((goal) => expect(goal).toEqual(mockGoal));
    httpMock.expectOne(`${baseUrl}/${mockGoal.id}`).flush(mockGoal);
  });

  it('create() posts to the base goals URL', () => {
    service.create({ title: 'Run a half marathon', icon: 'flag', color: '#3F51B5', targetType: 'TASK_COUNT', targetValue: 10 }).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush(mockGoal);
  });

  it('update() patches the specific goal', () => {
    service.update(mockGoal.id, { title: 'Updated' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockGoal.id}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockGoal);
  });

  it('remove() deletes the specific goal', () => {
    service.remove(mockGoal.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockGoal.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('archive() posts to the archive sub-resource', () => {
    service.archive(mockGoal.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockGoal.id}/archive`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockGoal, archived: true });
  });

  it('unarchive() posts to the unarchive sub-resource', () => {
    service.unarchive(mockGoal.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockGoal.id}/unarchive`);
    expect(req.request.method).toBe('POST');
    req.flush(mockGoal);
  });

  it('progress() requests the progress sub-resource', () => {
    service.progress(mockGoal.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockGoal.id}/progress`);
    expect(req.request.method).toBe('GET');
    req.flush({
      goalId: mockGoal.id,
      targetType: 'TASK_COUNT',
      targetValue: 10,
      currentValue: 4,
      progressPercent: 40,
      remainingValue: 6,
      isComplete: false,
    });
  });

  it('addMilestone() posts to the goal-scoped milestones sub-resource', () => {
    service.addMilestone(mockGoal.id, { title: 'First checkpoint' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockGoal.id}/milestones`);
    expect(req.request.method).toBe('POST');
    req.flush(mockMilestone);
  });

  it('updateMilestone() patches /goals/milestones/:id — not nested under a goal id', () => {
    service.updateMilestone(mockMilestone.id, { completed: true }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/milestones/${mockMilestone.id}`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockMilestone, completed: true });
  });

  it('removeMilestone() deletes /goals/milestones/:id — not nested under a goal id', () => {
    service.removeMilestone(mockMilestone.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/milestones/${mockMilestone.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
