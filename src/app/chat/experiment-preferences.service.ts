import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { ChatStore } from './chat-store.service';

interface ExperimentPreferences {
  acknowledged: boolean;
  memory: boolean;
  sandbox: boolean;
  recording: boolean;
}
type ExperimentFeature = Exclude<keyof ExperimentPreferences, 'acknowledged'>;
const OFF: ExperimentPreferences = { acknowledged: false, memory: false, sandbox: false, recording: false };

/** Account-bound choices live only in memory. The server still verifies identity and provider budgets. */
@Injectable({ providedIn: 'root' })
export class ExperimentPreferencesService {
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatStore);
  private readonly preferences = signal<ExperimentPreferences>({ ...OFF });
  readonly state = this.preferences.asReadonly();
  private account: string | null = null;

  constructor() {
    this.auth.state$.pipe(takeUntilDestroyed()).subscribe(state => {
      // A session check may temporarily be loading; it must not erase a user's choices.
      if (state.loading) return;
      const identity = state.isAuthenticated ? state.subject : null;
      if (state.isAuthenticated && !identity) return;
      if (identity !== this.account) {
        if (this.account) this.chats.clear();
        this.reset();
        this.account = identity;
      }
    });
  }

  acknowledge(enabled: boolean): void {
    const account = this.auth.snapshot;
    if (account.loading || !account.isAuthenticated || !account.subject || account.subject !== this.account) return;
    this.preferences.set({ acknowledged: true, memory: enabled, sandbox: enabled, recording: enabled });
  }

  set(feature: ExperimentFeature, enabled: boolean): void {
    if (!this.state().acknowledged || this.auth.snapshot.loading || !this.auth.snapshot.isAuthenticated ||
      this.auth.snapshot.subject !== this.account) return;
    this.preferences.update(current => ({ ...current, [feature]: enabled }));
  }

  reset(): void {
    this.preferences.set({ ...OFF });
  }
}
