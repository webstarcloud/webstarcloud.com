import { ErrorHandler, Injectable } from '@angular/core';
import { ErrorReportingService } from './error-reporting.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private errorReporter: ErrorReportingService) {}

  handleError(error: unknown) {
    this.errorReporter.report({
      context: 'global',
      error
    });
  }
}
