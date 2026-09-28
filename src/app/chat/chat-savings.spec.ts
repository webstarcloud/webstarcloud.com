import { CHAT_MODELS, ChatTurn } from './chat.models';
import { inferenceSaving, savingLabel, usageLabel } from './chat-savings';

const turn = (called: boolean, duration: number, overrides: Partial<ChatTurn> = {}): ChatTurn => ({
  id: 1, prompt: 'Question', answer: 'Answer', reasoning: '', model: CHAT_MODELS[0],
  status: 'complete', guard: 'checked', servedModel: 'pinned-model-v1',
  metrics: { startState: called ? 'warm' : 'unknown', outputTokens: called ? 64 : 0,
    inputTokens: called ? 100 : 0, ttftMs: 10, tokensPerSecond: null, totalMs: duration + 100,
    modelCalled: called, modelDurationMs: duration, ...(called ? {} : { modelBypass: 'calculator' }) },
  ...overrides,
});

describe('Measured model usage and savings estimates', () => {
  it('requires both a successful bypass and a matching warm model measurement', () => {
    const skipped = turn(false, 0);
    expect(inferenceSaving(skipped, [skipped])).toBeNull();
    expect(inferenceSaving(turn(true, 1000), [turn(true, 1000)])).toBeNull();
    const cold = turn(true, 20_000);
    cold.metrics!.startState = 'cold';
    expect(inferenceSaving(skipped, [cold, turn(true, 5000, {servedModel: 'other-version'}),
      turn(true, 5000, {model: CHAT_MODELS[1]}), turn(true, 5000, {status: 'stopped'})])).toBeNull();
    const failedLookup = turn(false, 0);
    delete failedLookup.metrics!.modelBypass;
    expect(inferenceSaving(failedLookup, [turn(true, 5000)])).toBeNull();
  });
  it('uses the median engine duration, not total request latency or a fabricated token count', () => {
    const skipped = turn(false, 0);
    const result = inferenceSaving(skipped, [turn(true, 2000), turn(true, 6000)])!;
    expect(result.referenceMs).toBe(4000);
    expect(result.samples).toBe(2);
    expect(result.usd).toBeCloseTo(4 * 4 * 0.0000133334, 10);
    expect(savingLabel(result.usd)).toBe('−$0.0002 est.');
  });
  it('keeps sub-cent estimates visible without rounding them into a false zero', () => {
    expect(savingLabel(0.000001)).toBe('<$0.0001 est. saved');
    expect(savingLabel(0.12)).toBe('−$0.12 est.');
    expect(savingLabel(0)).toBe('—');
    expect(savingLabel(NaN)).toBe('—');
  });
  it('does not treat missing input-token counts as zero', () => {
    const metrics = turn(true, 1000).metrics!;
    expect(usageLabel(metrics)).toBe('164 tokens');
    delete metrics.inputTokens;
    expect(usageLabel(metrics)).toBe('64 output tokens');
  });
});
