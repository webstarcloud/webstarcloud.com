export function costReport(compute = 0.001) {
  return { available: true, summary: {
    version: 'frontier-api-approx-2026-09-30', since: '2026-09-30T10:00:00.000Z', updatedAt: '2026-09-30T10:05:00.000Z',
    comparator: { model: 'Estimated frontier API', inputUsdPerMillion: 3, outputUsdPerMillion: 15,
      checkedOn: '2026-09-30', approximate: true },
    pricedRequests: 1, unpricedRequests: 0, inputTokens: 100, outputTokens: 100,
    referenceApiUsd: 0.0018, estimatedModelComputeUsd: compute, estimatedDifferenceUsd: 0.0018 - compute,
    scope: 'Completed model replies only; other overhead excluded.',
  } };
}
