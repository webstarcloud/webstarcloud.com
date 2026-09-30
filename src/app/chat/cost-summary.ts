export interface CostSummary {
  version: string;
  since: string;
  updatedAt: string;
  comparator: {
    model: string;
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
    checkedOn: string;
    approximate: boolean;
  };
  pricedRequests: number;
  unpricedRequests: number;
  inputTokens: number;
  outputTokens: number;
  referenceApiUsd: number | null;
  estimatedModelComputeUsd: number | null;
  estimatedDifferenceUsd: number | null;
  scope: string;
}
export type CostReport = { available: true; summary: CostSummary }
  | { available: false; reason: 'not_started' | 'unavailable' };

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const date = (value: unknown): value is string => typeof value === 'string' && value.length <= 30 &&
  Number.isFinite(Date.parse(value));
const amount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e9;

/** Public aggregate receipts contain numbers and dates, never conversation text. */
export function readCostReport(value: unknown): CostReport | null {
  const report = object(value);
  if (!report) return null;
  if (report['available'] === false) {
    return report['reason'] === 'not_started' || report['reason'] === 'unavailable'
      ? { available: false, reason: report['reason'] } : null;
  }
  const data = object(report['summary']);
  const comparator = object(data?.['comparator']);
  if (report['available'] !== true || !data || !comparator ||
      typeof data['version'] !== 'string' || data['version'].length > 100 ||
      !date(data['since']) || !date(data['updatedAt']) || Date.parse(data['since']) > Date.parse(data['updatedAt']) ||
      typeof comparator['model'] !== 'string' || comparator['model'].length > 80 ||
      !amount(comparator['inputUsdPerMillion']) || !amount(comparator['outputUsdPerMillion']) ||
      !date(comparator['checkedOn']) || comparator['approximate'] !== true ||
      typeof data['scope'] !== 'string' || data['scope'].length > 2000) return null;
  for (const key of ['pricedRequests', 'unpricedRequests', 'inputTokens', 'outputTokens']) {
    if (!Number.isSafeInteger(data[key]) || (data[key] as number) < 0) return null;
  }
  const priced = data['pricedRequests'] as number;
  if (priced === 0) {
    if (data['referenceApiUsd'] !== null || data['estimatedModelComputeUsd'] !== null || data['estimatedDifferenceUsd'] !== null)
      return null;
  } else {
    if (!amount(data['referenceApiUsd']) || !amount(data['estimatedModelComputeUsd']) ||
        typeof data['estimatedDifferenceUsd'] !== 'number' || !Number.isFinite(data['estimatedDifferenceUsd']) ||
        Math.abs(data['referenceApiUsd'] - data['estimatedModelComputeUsd'] - data['estimatedDifferenceUsd']) > 1e-7)
      return null;
    const reference = ((data['inputTokens'] as number) * comparator['inputUsdPerMillion'] +
      (data['outputTokens'] as number) * comparator['outputUsdPerMillion']) / 1e6;
    if (Math.abs(reference - data['referenceApiUsd']) > 1e-7) return null;
  }
  return { available: true, summary: {
    version: data['version'], since: data['since'], updatedAt: data['updatedAt'],
    comparator: { model: comparator['model'], inputUsdPerMillion: comparator['inputUsdPerMillion'],
      outputUsdPerMillion: comparator['outputUsdPerMillion'], checkedOn: comparator['checkedOn'], approximate: true },
    pricedRequests: priced, unpricedRequests: data['unpricedRequests'] as number,
    inputTokens: data['inputTokens'] as number, outputTokens: data['outputTokens'] as number,
    referenceApiUsd: data['referenceApiUsd'] as number | null,
    estimatedModelComputeUsd: data['estimatedModelComputeUsd'] as number | null,
    estimatedDifferenceUsd: data['estimatedDifferenceUsd'] as number | null, scope: data['scope'],
  } };
}

export function costAmount(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.0001) return '<$0.0001';
  return '$' + usd.toFixed(usd < 0.01 ? 4 : 2);
}
