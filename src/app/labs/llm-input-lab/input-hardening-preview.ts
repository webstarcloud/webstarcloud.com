export type PreviewPolicy = 'balanced_chat' | 'strict_exec' | 'code_mode';

export interface PreviewSignal {
  readonly key: string;
  readonly code: string;
  readonly label: string;
  readonly count: number;
  readonly kind: 'removed' | 'flagged';
}

export interface PreviewResult {
  readonly output: string;
  readonly policy: PreviewPolicy;
  readonly normalization: 'NFC' | 'NFKC';
  readonly changed: boolean;
  readonly removedTotal: number;
  readonly removed: readonly PreviewSignal[];
  readonly flagged: readonly PreviewSignal[];
  readonly reportJson: string;
}

interface PolicyConfig {
  readonly normalization: 'NFC' | 'NFKC';
  readonly removeBidiMarks: boolean;
  readonly removeDefaultIgnorables: boolean;
  readonly tidyWhitespace: boolean;
}

const POLICY_CONFIG: Record<PreviewPolicy, PolicyConfig> = {
  balanced_chat: {
    normalization: 'NFC',
    removeBidiMarks: false,
    removeDefaultIgnorables: false,
    tidyWhitespace: true
  },
  strict_exec: {
    normalization: 'NFKC',
    removeBidiMarks: true,
    removeDefaultIgnorables: true,
    tidyWhitespace: true
  },
  code_mode: {
    normalization: 'NFC',
    removeBidiMarks: true,
    removeDefaultIgnorables: true,
    tidyWhitespace: false
  }
};

const SIGNALS: Record<string, { code: string; label: string }> = {
  bidi_control: { code: 'IH001_BIDI_CONTROL', label: 'Bidi control' },
  default_ignorable: { code: 'IH002_DEFAULT_IGNORABLE', label: 'Default ignorable' },
  junk_invisible: { code: 'IH003_JUNK_INVISIBLE', label: 'Junk invisible' },
  control_or_format: { code: 'IH004_CONTROL_OR_FORMAT', label: 'Control or format character' },
  carriage_return: { code: 'IH005_CARRIAGE_RETURN', label: 'Carriage return' },
  whitespace_tidy: { code: 'IH006_WHITESPACE_TIDY', label: 'Whitespace tidy' },
  bidi_mark: { code: 'IH007_BIDI_MARK', label: 'Bidi mark' },
  tag_char: { code: 'IH008_TAG_CHARACTER', label: 'Unicode tag character' },
  line_separator: { code: 'IH012_LINE_SEPARATOR', label: 'Unicode line separator' },
  mixed_script_word: { code: 'IH020_CONFUSABLE_MIXED_SCRIPT', label: 'Mixed-script word' },
  confusable_styled: { code: 'IH021_CONFUSABLE_STYLED_LATIN', label: 'Styled or compatibility text' }
};

const JUNK_INVISIBLES = new Set([0x200b, 0x2060, 0xfeff]);
const BIDI_MARKS = new Set([0x061c, 0x200e, 0x200f]);

export function sanitizePreview(input: string, policy: PreviewPolicy): PreviewResult {
  const config = POLICY_CONFIG[policy];
  const normalized = input.normalize(config.normalization);
  const removedCounts = new Map<string, number>();
  const flaggedCounts = new Map<string, number>();
  const outputCharacters: string[] = [];

  for (const character of normalized) {
    const codePoint = character.codePointAt(0)!;
    const signal = classifyCodePoint(codePoint, config);

    if (signal?.action === 'remove') {
      increment(removedCounts, signal.key);
      continue;
    }

    if (signal?.action === 'flag') {
      increment(flaggedCounts, signal.key);
    }

    outputCharacters.push(character);
  }

  let output = outputCharacters.join('');
  if (config.tidyWhitespace) {
    const tidied = output
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (tidied !== output) {
      increment(removedCounts, 'whitespace_tidy');
      output = tidied;
    }
  }

  if (normalized !== input && containsCompatibilityText(input)) {
    increment(flaggedCounts, 'confusable_styled');
  }

  const mixedScriptCount = countMixedScriptWords(output);
  if (mixedScriptCount > 0) {
    flaggedCounts.set('mixed_script_word', mixedScriptCount);
  }

  const removed = toSignals(removedCounts, 'removed');
  const flagged = toSignals(flaggedCounts, 'flagged');
  const removedTotal = [...removedCounts.values()].reduce((total, count) => total + count, 0);
  const changed = output !== input;
  const reasonCodes = [...removed, ...flagged].reduce<Record<string, number>>((codes, signal) => {
    codes[signal.code] = (codes[signal.code] || 0) + signal.count;
    return codes;
  }, {});

  const reportJson = JSON.stringify({
    report_version: 1,
    policy,
    normalization: config.normalization,
    changed,
    removed_counts: Object.fromEntries(removedCounts),
    flagged_counts: Object.fromEntries(flaggedCounts),
    reason_codes: reasonCodes,
    stats: {
      normalized_changed: normalized !== input,
      browser_preview: true
    }
  }, null, 2);

  return {
    output,
    policy,
    normalization: config.normalization,
    changed,
    removedTotal,
    removed,
    flagged,
    reportJson
  };
}

function classifyCodePoint(codePoint: number, config: PolicyConfig) {
  if (codePoint === 0x0d) {
    return { key: 'carriage_return', action: 'remove' } as const;
  }

  if (codePoint === 0x2028 || codePoint === 0x2029) {
    return { key: 'line_separator', action: 'remove' } as const;
  }

  if (isBidiControl(codePoint)) {
    return { key: 'bidi_control', action: 'remove' } as const;
  }

  if (BIDI_MARKS.has(codePoint)) {
    return { key: 'bidi_mark', action: config.removeBidiMarks ? 'remove' : 'flag' } as const;
  }

  if (isTagCharacter(codePoint)) {
    return { key: 'tag_char', action: 'remove' } as const;
  }

  if (JUNK_INVISIBLES.has(codePoint)) {
    return { key: 'junk_invisible', action: 'remove' } as const;
  }

  if (isDefaultIgnorable(codePoint)) {
    return {
      key: 'default_ignorable',
      action: config.removeDefaultIgnorables ? 'remove' : 'flag'
    } as const;
  }

  if (isControl(codePoint)) {
    return { key: 'control_or_format', action: 'remove' } as const;
  }

  return undefined;
}

function isBidiControl(codePoint: number) {
  return (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069);
}

function isDefaultIgnorable(codePoint: number) {
  return codePoint === 0x00ad ||
    codePoint === 0x200c ||
    codePoint === 0x200d ||
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef);
}

function isTagCharacter(codePoint: number) {
  return codePoint >= 0xe0000 && codePoint <= 0xe007f;
}

function isControl(codePoint: number) {
  if (codePoint === 0x09 || codePoint === 0x0a) {
    return false;
  }

  return codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f);
}

function containsCompatibilityText(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return (codePoint >= 0xff00 && codePoint <= 0xffef) ||
      (codePoint >= 0x1d400 && codePoint <= 0x1d7ff) ||
      (codePoint >= 0x2460 && codePoint <= 0x24ff);
  });
}

function countMixedScriptWords(value: string) {
  return value.split(/\s+/).filter((word) => {
    return /\p{Script=Latin}/u.test(word) && /\p{Script=Cyrillic}/u.test(word);
  }).length;
}

function increment(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) || 0) + 1);
}

function toSignals(counts: Map<string, number>, kind: PreviewSignal['kind']) {
  return [...counts.entries()].map(([key, count]): PreviewSignal => ({
    key,
    code: SIGNALS[key]?.code || key,
    label: SIGNALS[key]?.label || key,
    count,
    kind
  }));
}
