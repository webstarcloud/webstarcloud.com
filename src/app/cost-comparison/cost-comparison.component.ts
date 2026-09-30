import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CostSummaryService } from '../chat/cost-summary.service';
import { costAmount } from '../chat/cost-summary';

@Component({
  selector: 'app-cost-comparison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cost-comparison.component.html',
  styleUrl: './cost-comparison.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CostComparisonComponent implements OnInit {
  readonly costs = inject(CostSummaryService);
  readonly costAmount = costAmount;
  get summary() {
    const report = this.costs.report();
    return report.available ? report.summary : null;
  }
  get label(): string {
    const difference = this.summary?.estimatedDifferenceUsd;
    if (difference == null) return 'Savings pending';
    // Round the headline to cents; exact small amounts stay in the details.
    const amount = Math.abs(difference).toFixed(2);
    return difference >= 0 ? `−$${amount} saved` : `+$${amount} extra cost`;
  }
  get requests(): number | null {
    const total = this.summary;
    return total ? total.pricedRequests + total.unpricedRequests : null;
  }
  get exactDifference(): string {
    const difference = this.summary?.estimatedDifferenceUsd;
    return difference == null ? '—' : costAmount(Math.abs(difference));
  }
  get statusLabel(): string {
    const report = this.costs.report();
    if (this.costs.loading() && !report.available) return 'Checking savings…';
    return report.available ? this.label : report.reason === 'not_started'
      ? 'Savings pending' : 'Savings unavailable';
  }
  ngOnInit(): void { void this.costs.refresh(); }
}
