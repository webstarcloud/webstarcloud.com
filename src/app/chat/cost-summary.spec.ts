import { costAmount, readCostReport } from './cost-summary';

import { costReport } from './cost-summary.testing';

describe('Cost comparison receipts', () => {
  it('retains signed differences, including more expensive local compute', () => {
    expect(readCostReport(costReport())?.available).toBeTrue();
    const report = readCostReport(costReport(0.003));
    expect(report?.available && report.summary.estimatedDifferenceUsd).toBeCloseTo(-0.0012, 8);
  });
  it('keeps missing and unpriced usage blank instead of inventing savings', () => {
    expect(readCostReport({ available: false, reason: 'not_started' })).toEqual({ available: false, reason: 'not_started' });
    const report = costReport();
    Object.assign(report.summary, { pricedRequests: 0, unpricedRequests: 1, inputTokens: 0, outputTokens: 0,
      referenceApiUsd: null, estimatedModelComputeUsd: null, estimatedDifferenceUsd: null });
    expect(readCostReport(report)?.available).toBeTrue();
  });
  it('rejects inconsistent dollars, token totals and dates', () => {
    const wrongDifference = costReport();
    wrongDifference.summary.estimatedDifferenceUsd = 5;
    expect(readCostReport(wrongDifference)).toBeNull();
    const wrongTokens = costReport();
    wrongTokens.summary.inputTokens = 1000;
    expect(readCostReport(wrongTokens)).toBeNull();
    const wrongDates = costReport();
    wrongDates.summary.updatedAt = '2025-01-01';
    expect(readCostReport(wrongDates)).toBeNull();
    const fractional = costReport();
    fractional.summary.outputTokens = 1.5;
    expect(readCostReport(fractional)).toBeNull();
  });
  it('renders small real estimates without rounding them to zero', () => {
    expect(costAmount(0)).toBe('$0.00');
    expect(costAmount(0.00001)).toBe('<$0.0001');
    expect(costAmount(0.0012)).toBe('$0.0012');
    expect(costAmount(3.14)).toBe('$3.14');
  });
});
