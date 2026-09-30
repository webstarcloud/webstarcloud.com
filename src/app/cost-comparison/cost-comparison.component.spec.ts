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
    expect(text).toContain('Awaiting measured replies');
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
    expect(text).toContain('$0.0012 est. extra compute');
    expect(text).toContain('$3 per million input tokens');
    expect(text).toContain('$15 per million output tokens');
    expect(text).not.toContain('Model calls avoided');
  });
});
