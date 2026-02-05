import { Injectable } from '@angular/core';

export interface ErrorReport {
  context?: string;
  error: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorReportingService {
  report(report: ErrorReport) {
    const normalized = this.normalizeError(report.error);
    const payload = {
      context: report.context ?? 'unknown',
      error: normalized
    };

    // Centralized place to wire external logging if needed.
    console.error('[Error]', payload);
  }

  private normalizeError(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return {
      name: 'UnknownError',
      message: String(error)
    };
  }
}
