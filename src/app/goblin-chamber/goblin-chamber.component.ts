import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ParticlesModule } from '../particles/particles.module';
import { FIRST_RUN, FundingService, FundingState } from './funding.service';

@Component({
  selector: 'app-goblin-chamber',
  standalone: true,
  imports: [CommonModule, RouterLink, ParticlesModule],
  templateUrl: './goblin-chamber.component.html',
  styleUrl: './goblin-chamber.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoblinChamberComponent implements OnDestroy {
  readonly campaign = FIRST_RUN;
  readonly funding$ = inject(FundingService).state$;
  private readonly motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  readonly paused = signal(this.motionPreference.matches);
  private readonly onMotionChange = (event: MediaQueryListEvent) => { this.paused.set(event.matches); };
  constructor() { this.motionPreference.addEventListener('change', this.onMotionChange); }
  ngOnDestroy() { this.motionPreference.removeEventListener('change', this.onMotionChange); }
  fill(state: FundingState): number {
    return state.kind === 'ready' ? Math.min(100, state.snapshot.receivedMinor / state.snapshot.targetMinor * 100) : 0;
  }
  label(state: FundingState): string {
    if (state.kind === 'setup') return 'Awaiting payment setup';
    if (state.kind === 'loading') return 'Checking funding';
    if (state.kind === 'unavailable') return 'Funding status unavailable';
    if (state.kind !== 'ready') return 'Checking funding';
    return { collecting: 'Filling the tank', funded: 'Target reached', queued: 'Run queued', running: 'Training in progress', completed: 'Run complete', held: 'Launch on hold' }[state.snapshot.status];
  }
}
