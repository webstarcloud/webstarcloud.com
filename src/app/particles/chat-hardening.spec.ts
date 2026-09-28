import { readHardeningReceipt } from './chat-hardening';
import { HardeningReceiptComponent } from './hardening-receipt.component';

describe('Chat hardening receipt', () => {
  const hardening = { enabled: true, changed: false, blocked: true, model_called: false,
    action: 'quarantine', library_version: '3.0.0', policy: 'strict_exec',
    reason_codes: ['IH033_ENCODED_RISKY_UNICODE'] };

  it('reads both direct and API Gateway wrapped responses', () => {
    for (const input of [{ hardening }, JSON.stringify({ hardening }), { body: JSON.stringify({ hardening }) }]) {
      expect(readHardeningReceipt(input)?.blocked).toBeTrue();
    }
  });
  it('does not invent a receipt for an older backend or malformed response', () => {
    for (const input of ['offline', { answer: 'Hi' }, { hardening: {} }, { hardening: { ...hardening, model_called: true } }]) {
      expect(readHardeningReceipt(input)).toBeUndefined();
    }
  });
  it('explains encoded blocking and identifies a disabled guard', () => {
    const component = new HardeningReceiptComponent();
    component.receipt = hardening;
    expect(component.title).toBe('Blocked before the model');
    expect(component.explain(hardening.reason_codes[0])).toContain('encoding');
    component.receipt = { ...hardening, enabled: false, blocked: false };
    expect(component.title).toBe('Guard inactive');
  });
});
