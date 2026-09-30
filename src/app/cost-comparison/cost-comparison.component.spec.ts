import { TestBed } from '@angular/core/testing';
import { CostComparisonComponent } from './cost-comparison.component';
import { COST_ENDPOINT, CostSummaryService } from '../chat/cost-summary.service';
import { costReport } from '../chat/cost-summary.testing';

describe('CostComparisonComponent', () => {
  it('shows the assumed rates before measured replies exist without inventing a dollar total', () => {
    TestBed.configureTestingModule({ imports: [CostComparisonComponent], providers: [{ provide: COST_ENDPOINT, useValue: '' }] });
    const fixture = TestBed.createComponent(CostComparisonComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Savings pending');
    expect(text).toContain('$3 per million input tokens');
    expect(text).toContain('$15 per million output tokens');
    expect(text).not.toContain('$0.00');
  });
  it('shows an honest signed estimate and keeps assumptions discoverable', () => {
    TestBed.configureTestingModule({ imports: [CostComparisonComponent], providers: [{ provide: COST_ENDPOINT, useValue: '' }] });
    const costs = TestBed.inject(CostSummaryService);
    costs.accept(costReport(0.003));
    const fixture = TestBed.createComponent(CostComparisonComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('summary').textContent).toContain('+$0.00 extra cost');
    expect(text).toContain('$0.0012');
    expect(text).toContain('$3 per million input tokens');
    expect(text).toContain('$15 per million output tokens');
    expect(text).not.toContain('Model calls avoided');
  });
  it('shows one rounded site total and counts all completed requests', () => {
    TestBed.configureTestingModule({ imports: [CostComparisonComponent], providers: [{ provide: COST_ENDPOINT, useValue: '' }] });
    const report = costReport(0.00179999);
    report.summary.unpricedRequests = 7;
    TestBed.inject(CostSummaryService).accept(report);
    const fixture = TestBed.createComponent(CostComparisonComponent);
    fixture.detectChanges();
    const headline = fixture.nativeElement.querySelector('summary').textContent;
    expect(headline).toContain('−$0.00 saved');
    expect(headline).toContain('8 requests');
    expect(headline).not.toContain('<$');
    expect(headline).not.toContain('Total model compute');
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
  });
});
