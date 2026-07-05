import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AnalyticsApiService } from './analytics-api.service';

describe('AnalyticsApiService', () => {
  let service: AnalyticsApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/analytics`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyticsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getOverview() requests the overview endpoint with no params', () => {
    service.getOverview().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/overview`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getProductivity() forwards the period query param', () => {
    service.getProductivity({ period: 'MONTH' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/productivity`);
    expect(req.request.params.get('period')).toBe('MONTH');
    req.flush({});
  });

  it('getHabits()/getGoals()/getPlanner()/getJournal()/getCalendar() hit their own domain path', () => {
    service.getHabits({ period: 'WEEK' }).subscribe();
    httpMock.expectOne((r) => r.url === `${baseUrl}/habits`).flush({});

    service.getGoals({ period: 'WEEK' }).subscribe();
    httpMock.expectOne((r) => r.url === `${baseUrl}/goals`).flush({});

    service.getPlanner({ period: 'WEEK' }).subscribe();
    httpMock.expectOne((r) => r.url === `${baseUrl}/planner`).flush({});

    service.getJournal({ period: 'WEEK' }).subscribe();
    httpMock.expectOne((r) => r.url === `${baseUrl}/journal`).flush({});

    service.getCalendar({ period: 'WEEK' }).subscribe();
    httpMock.expectOne((r) => r.url === `${baseUrl}/calendar`).flush({});
  });

  it('listExports() requests the export history with pagination params', () => {
    service.listExports({ page: 2, pageSize: 10 }).subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/export`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush({ data: [], meta: { page: 2, pageSize: 10, total: 0, totalPages: 1 } });
  });

  it('createExport() posts the report/format/period selection', () => {
    service.createExport({ type: 'PRODUCTIVITY', format: 'CSV', period: 'WEEK' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/export`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'PRODUCTIVITY', format: 'CSV', period: 'WEEK' });
    req.flush({
      id: 'export-1',
      type: 'PRODUCTIVITY',
      format: 'CSV',
      status: 'COMPLETED',
      filePath: '/exports/user-1/productivity-1.csv',
      errorMessage: null,
      createdAt: '2026-07-05T00:00:00.000Z',
      content: 'Bucket,Value\n2026-07-05,3',
    });
  });
});
