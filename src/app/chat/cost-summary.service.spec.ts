import { TestBed } from '@angular/core/testing';
import { COST_ENDPOINT, COST_FETCH, CostSummaryService } from './cost-summary.service';
import { costReport } from './cost-summary.testing';

const response = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

describe('CostSummaryService', () => {
  let request: jasmine.Spy;
  let service: CostSummaryService;
  beforeEach(() => {
    request = jasmine.createSpy('fetch');
    TestBed.configureTestingModule({ providers: [
      { provide: COST_ENDPOINT, useValue: 'https://example.com/v1/cost-summary' },
      { provide: COST_FETCH, useValue: request },
    ] });
    service = TestBed.inject(CostSummaryService);
  });
  it('loads aggregate totals without credentials and shares a concurrent request', async () => {
    request.and.returnValue(Promise.resolve(response(costReport())));
    const first = service.refresh();
    expect(service.refresh()).toBe(first);
    await first;
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.calls.mostRecent().args[1].credentials).toBe('omit');
    expect(service.report().available).toBeTrue();
    expect(service.loading()).toBeFalse();
  });
  it('does not overwrite a fresh completion receipt with an older cached GET', async () => {
    let finish!: (value: Response) => void;
    request.and.returnValue(new Promise<Response>(resolve => { finish = resolve; }));
    const pending = service.refresh();
    service.accept(costReport(0.003));
    finish(response({ available: false, reason: 'not_started' }));
    await pending;
    const result = service.report();
    expect(result.available && result.summary.estimatedModelComputeUsd).toBe(0.003);
  });
  it('does not replace a fresh receipt when the earlier GET fails', async () => {
    let fail!: (error: Error) => void;
    request.and.returnValue(new Promise<Response>((_, reject) => { fail = reject; }));
    const pending = service.refresh();
    service.accept(costReport());
    fail(new Error('Offline'));
    await pending;
    expect(service.report().available).toBeTrue();
  });
  it('shows unavailable instead of zero for an invalid or failed response', async () => {
    request.and.returnValue(Promise.resolve(response({ available: true, summary: {} })));
    await service.refresh();
    expect(service.report()).toEqual({ available: false, reason: 'unavailable' });
    service.accept({ available: true });
    expect(service.report()).toEqual({ available: false, reason: 'unavailable' });
  });
});
