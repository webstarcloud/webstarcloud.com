import { sanitizePreview } from './input-hardening-preview';

describe('sanitizePreview', () => {
  it('removes bidi controls and junk invisibles', () => {
    const result = sanitizePreview('approve\u200binvoice\u202e', 'balanced_chat');

    expect(result.output).toBe('approveinvoice');
    expect(result.removed.map((signal) => signal.code)).toContain('IH001_BIDI_CONTROL');
    expect(result.removed.map((signal) => signal.code)).toContain('IH003_JUNK_INVISIBLE');
  });

  it('uses compatibility normalization for strict execution input', () => {
    const result = sanitizePreview('ａｄｍｉｎ\u200d', 'strict_exec');

    expect(result.output).toBe('admin');
    expect(result.normalization).toBe('NFKC');
    expect(result.flagged.map((signal) => signal.code)).toContain('IH021_CONFUSABLE_STYLED_LATIN');
  });

  it('flags mixed Latin and Cyrillic words', () => {
    const result = sanitizePreview('аdmin', 'code_mode');

    expect(result.flagged.map((signal) => signal.code)).toContain('IH020_CONFUSABLE_MIXED_SCRIPT');
  });
});
