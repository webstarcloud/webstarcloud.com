import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, catchError, exhaustMap, map, of, shareReplay, startWith, timeout, timer } from 'rxjs';
import { environment } from '../../environments/environment';

export const FIRST_RUN = {
  id: 'goblin-20b-01', title: 'The 20B-token experiment', currency: 'USD', targetMinor: 7200
} as const;
/** Owner-reported existing donations, separate from the future payment ledger. */
export const REPORTED_DONATIONS = {
  campaignId: FIRST_RUN.id, currency: FIRST_RUN.currency, receivedMinor: 2422,
  reportedOn: '2026-09-30', source: 'owner-reported'
} as const;
export const FUNDING_API = new InjectionToken<string>('Funding API', {
  providedIn: 'root', factory: () => environment.fundingApiUrl
});
export type RunState = 'collecting' | 'funded' | 'queued' | 'running' | 'completed' | 'held';
export interface FundingSnapshot {
  campaignId: string;
  currency: 'USD';
  targetMinor: number;
  receivedMinor: number;
  status: RunState;
  updatedAt: string;
  checkoutUrl: string | null;
}
export type FundingState = { kind: 'setup' | 'loading' | 'unavailable' } |
  { kind: 'ready'; snapshot: FundingSnapshot };

/** Reject mismatched campaigns and malformed totals instead of displaying misleading progress. */
export function parseFunding(value: unknown): FundingSnapshot {
  const data = value as Partial<FundingSnapshot> | null;
  if (!data || data.campaignId !== FIRST_RUN.id || data.currency !== FIRST_RUN.currency ||
    data.targetMinor !== FIRST_RUN.targetMinor || !Number.isSafeInteger(data.receivedMinor) ||
    data.receivedMinor! < 0 || !['collecting', 'funded', 'queued', 'running', 'completed', 'held'].includes(data.status!) ||
    typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) ||
    Date.parse(data.updatedAt) < Date.now() - 120_000 || Date.parse(data.updatedAt) > Date.now() + 60_000) {
    throw new Error('Funding response is invalid or stale');
  }
  if (data.checkoutUrl !== null) {
    const url = new URL(data.checkoutUrl!);
    if (url.protocol !== 'https:' || !['buy.stripe.com', 'checkout.stripe.com'].includes(url.hostname) || url.username || url.password) {
      throw new Error('Unrecognized checkout destination');
    }
  }
  return data as FundingSnapshot;
}

@Injectable({ providedIn: 'root' })
export class FundingService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(FUNDING_API).replace(/\/$/, '');
  readonly state$: Observable<FundingState> = this.api
    ? timer(0, 30_000).pipe(
      exhaustMap(() => this.http.get<unknown>(`${this.api}/funding`).pipe(
        timeout(8000),
        map(value => ({ kind: 'ready', snapshot: parseFunding(value) } as FundingState)),
        catchError(() => of<FundingState>({ kind: 'unavailable' }))
      )),
      startWith<FundingState>({ kind: 'loading' }),
      shareReplay({ bufferSize: 1, refCount: true })
    ) : of({ kind: 'setup' });
}
