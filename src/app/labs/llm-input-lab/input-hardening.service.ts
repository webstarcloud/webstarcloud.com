import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export type HardeningPolicy = 'balanced_chat' | 'strict_exec' | 'code_mode';

export interface EncodedSample {
  source: 'input' | 'sanitized';
  start: number;
  end: number;
  encodings: string[];
  decode_depth: number;
  codepoints: string[];
  reasons: string[];
}

export interface InspectionResult {
  operation: 'inspect';
  library: { name: string; version: string };
  clean: string;
  report: {
    report_version: number;
    policy: HardeningPolicy;
    normalization: string;
    changed: boolean;
    removed_counts: Record<string, number>;
    flagged_counts: Record<string, number>;
    reason_codes: Record<string, number>;
    spans: unknown[];
    stats: { encoded_unicode_samples?: EncodedSample[]; [key: string]: unknown };
  };
  decision: { action: 'allow' | 'quarantine' | 'reject'; reason_codes: string[] };
}

/** Expose invisible characters for reading; this does not sanitize the input. */
export function visibleCharacters(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, character =>
    character === '\n' ? '\n' : `\\u{${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}}`
  );
}

@Injectable({ providedIn: 'root' })
export class InputHardeningService {
  constructor(private readonly http: HttpClient) {}

  inspect(text: string, policy: HardeningPolicy): Observable<InspectionResult> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (environment.api.gatewayKey) {
      headers = headers.set('x-api-key', environment.api.gatewayKey);
    }
    return this.http.post<InspectionResult>(environment.api.inspectionUrl, {
      operation: 'inspect', text, policy
    }, { headers }).pipe(
      timeout(15000),
      map(result => {
        if (result?.operation !== 'inspect' || typeof result.clean !== 'string' ||
            !result.report || result.report.policy !== policy || !result.decision ||
            !['allow', 'quarantine', 'reject'].includes(result.decision.action) ||
            !Array.isArray(result.decision.reason_codes) || result.decision.reason_codes.some(code => typeof code !== 'string') ||
            result.library?.name !== 'llm-input-hardening' || !result.library?.version) {
          throw new Error('Inspection is unavailable. Please try again shortly.');
        }
        return result;
      })
    );
  }
}
