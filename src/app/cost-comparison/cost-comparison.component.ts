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
    return difference == null ? 'Awaiting measured model replies' :
      `${costAmount(Math.abs(difference))} ${difference >= 0 ? 'est. saved' : 'est. extra compute'}`;
  }
  get statusLabel(): string {
    if (this.costs.loading()) return 'Checking estimate…';
    const report = this.costs.report();
    return report.available ? this.label : report.reason === 'not_started'
      ? 'Awaiting measured replies' : 'Estimate unavailable';
  }
  ngOnInit(): void { void this.costs.refresh(); }
}
