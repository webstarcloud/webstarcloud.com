import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FIRST_RUN, FundingService, FundingState, REPORTED_DONATIONS } from './funding.service';

@Component({
  selector: 'app-goblin-chamber',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './goblin-chamber.component.html',
  styleUrl: './goblin-chamber.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoblinChamberComponent {
  readonly campaign = FIRST_RUN;
  readonly reportedDonations = REPORTED_DONATIONS;
  readonly funding$ = inject(FundingService).state$;
  received(state: FundingState): number | null {
    return state.kind === 'ready' ? state.snapshot.receivedMinor
      : state.kind === 'setup' ? this.reportedDonations.receivedMinor : null;
  }
  fill(state: FundingState): number {
    const received = this.received(state);
    return received === null ? 0 : Math.min(100, received / this.campaign.targetMinor * 100);
  }
  label(state: FundingState): string {
    if (state.kind === 'setup') return 'Reported donations';
    if (state.kind === 'loading') return 'Checking funding';
    if (state.kind === 'unavailable') return 'Funding status unavailable';
    if (state.kind !== 'ready') return 'Checking funding';
    return { collecting: 'Open for contributions', funded: 'Target reached', queued: 'Run queued', running: 'Training in progress', completed: 'Run complete', held: 'Launch on hold' }[state.snapshot.status];
  }
}
