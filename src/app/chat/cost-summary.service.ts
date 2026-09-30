import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { CostReport, readCostReport } from './cost-summary';

export const COST_ENDPOINT = new InjectionToken<string>('Public cost aggregate endpoint', {
  providedIn: 'root', factory: () => environment.chatEndpoint.replace(/\/v1\/chat$/, '/v1/cost-summary'),
});
export const COST_FETCH = new InjectionToken<typeof fetch>('Cost summary fetch', {
  providedIn: 'root', factory: () => fetch.bind(window),
});

@Injectable({ providedIn: 'root' })
export class CostSummaryService {
  private readonly endpoint = inject(COST_ENDPOINT);
  private readonly request = inject(COST_FETCH);
  private pending?: Promise<void>;
  private revision = 0;
  readonly report = signal<CostReport>({ available: false, reason: 'not_started' });
  readonly loading = signal(false);

  accept(value: unknown): void {
    this.revision++;
    this.report.set(readCostReport(value) ?? { available: false, reason: 'unavailable' });
  }

  refresh(): Promise<void> {
    if (!this.endpoint) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = this.load().finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private async load(): Promise<void> {
    const revision = this.revision;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    this.loading.set(true);
    try {
      const response = await this.request(this.endpoint, {
        method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit',
        redirect: 'error', signal: controller.signal,
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
        throw new Error('Cost summary unavailable');
      const raw = await response.text();
      if (raw.length > 16384) throw new Error('Cost summary too large');
      const result = readCostReport(JSON.parse(raw));
      if (!result) throw new Error('Invalid cost summary');
      if (this.revision === revision) this.report.set(result);
    } catch {
      if (this.revision === revision) this.report.set({ available: false, reason: 'unavailable' });
    } finally {
      clearTimeout(timer);
      this.loading.set(false);
    }
  }
}
