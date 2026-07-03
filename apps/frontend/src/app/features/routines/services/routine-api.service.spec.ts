import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Routine } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { RoutineApiService } from './routine-api.service';

describe('RoutineApiService', () => {
  let service: RoutineApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/routines`;

  const mockRoutine: Routine = {
    id: 'routine-1',
    name: 'Morning Routine',
    icon: 'wb_sunny',
    color: '#FF9800',
    description: null,
    isActive: true,
    goalId: null,
    steps: [],
    totalDurationMinutes: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoutineApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() requests without an isActive param when none is given', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.params.has('isActive')).toBe(false);
    req.flush([mockRoutine]);
  });

  it('list() passes isActive as a query param when given', () => {
    service.list(true).subscribe();
    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('isActive')).toBe('true');
    req.flush([mockRoutine]);
  });

  it('getById() requests the specific routine', () => {
    service.getById(mockRoutine.id).subscribe((routine) => expect(routine).toEqual(mockRoutine));
    httpMock.expectOne(`${baseUrl}/${mockRoutine.id}`).flush(mockRoutine);
  });

  it('create() posts to the base routines URL', () => {
    service.create({ name: 'Morning Routine', icon: 'wb_sunny', color: '#FF9800' }).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush(mockRoutine);
  });

  it('activate() patches the activate sub-resource', () => {
    service.activate(mockRoutine.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockRoutine.id}/activate`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockRoutine);
  });

  it('deactivate() patches the deactivate sub-resource', () => {
    service.deactivate(mockRoutine.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockRoutine.id}/deactivate`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockRoutine);
  });

  it('duplicate() posts to the duplicate sub-resource', () => {
    service.duplicate(mockRoutine.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockRoutine.id}/duplicate`);
    expect(req.request.method).toBe('POST');
    req.flush(mockRoutine);
  });

  it('addStep() posts to the steps sub-resource', () => {
    service.addStep(mockRoutine.id, { title: 'Drink water', startTime: '07:00', durationMinutes: 5 }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockRoutine.id}/steps`);
    expect(req.request.method).toBe('POST');
    req.flush(mockRoutine);
  });

  it('reorderSteps() patches the reorder sub-resource', () => {
    service.reorderSteps(mockRoutine.id, { stepIds: ['s2', 's1'] }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockRoutine.id}/steps/reorder`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ stepIds: ['s2', 's1'] });
    req.flush(mockRoutine);
  });

  it('removeStep() deletes the specific step', () => {
    service.removeStep(mockRoutine.id, 'step-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockRoutine.id}/steps/step-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockRoutine);
  });
});
