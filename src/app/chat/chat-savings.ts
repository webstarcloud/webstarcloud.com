import { ChatMetrics, ChatTurn } from './chat.models';

/** Published eu-west-1 ARM tier-one price, checked 2026-09-28. All three model Lambdas use 4 GB. */
export const COMPUTE_COMPARISON = {
  memoryGb: 4,
  usdPerGbSecond: 0.0000133334,
  checkedOn: '2026-09-28',
  pricingUrl: 'https://aws.amazon.com/lambda/pricing/',
} as const;

export interface InferenceSaving {
  usd: number;
  referenceMs: number;
  samples: number;
}

/** This is a reference-compute comparison, never a counterfactual token count or billing credit. */
export function inferenceSaving(turn: ChatTurn, turns: readonly ChatTurn[]): InferenceSaving | null {
  if (turn.status !== 'complete' || turn.metrics?.modelCalled !== false || !turn.metrics.modelBypass || !turn.servedModel)
    return null;
  const durations = turns.filter(candidate => candidate.status === 'complete' &&
    candidate.model.id === turn.model.id && candidate.servedModel === turn.servedModel &&
    candidate.metrics?.modelCalled === true && candidate.metrics.startState === 'warm' &&
    Number.isFinite(candidate.metrics.modelDurationMs) && candidate.metrics.modelDurationMs! > 0)
    .map(candidate => candidate.metrics!.modelDurationMs!).sort((a, b) => a - b);
  if (!durations.length) return null;
  const middle = Math.floor(durations.length / 2);
  const referenceMs = durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2;
  return { referenceMs, samples: durations.length,
    usd: referenceMs / 1000 * COMPUTE_COMPARISON.memoryGb * COMPUTE_COMPARISON.usdPerGbSecond };
}

export function savingLabel(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return '—';
  if (usd < 0.0001) return '<$0.0001 est. saved';
  return `−$${usd.toFixed(usd < 0.01 ? 4 : 2)} est.`;
}

export function usageLabel(metrics: ChatMetrics): string {
  return metrics.inputTokens == null ? `${metrics.outputTokens.toLocaleString()} output tokens`
    : `${(metrics.inputTokens + metrics.outputTokens).toLocaleString()} tokens`;
}

export function savingDescription(saving: InferenceSaving | null): string {
  return saving ? `Estimated model compute avoided versus the median of ${saving.samples} warm run(s) of this same model in this conversation (${(saving.referenceMs / 1000).toFixed(2)}s). Uses the 4 GB Ireland ARM Lambda list rate, before credits or discounts. Different questions require different work; this is not a billing credit. Search, gateway and other request costs remain.`
    : 'The server answered without model inference. A dollar comparison needs a measured warm run of this same model in this conversation.';
}
