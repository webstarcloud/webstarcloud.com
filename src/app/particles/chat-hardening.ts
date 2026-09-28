export interface HardeningReceipt {
  enabled: boolean;
  changed: boolean;
  blocked: boolean;
  model_called: boolean;
  library_version?: string;
  policy?: string;
  action?: string;
  reason_codes: string[];
}

export const ATTACK_DEMOS = [
  { id: 'bidi', label: 'Hidden direction control', question: 'Show admin\u202Efdp.exe' },
  { id: 'encoded_bidi', label: 'Encoded control', question: 'abc&#x202E;def' },
  { id: 'mixed_script', label: 'Lookalike letters', question: 'Reset the password for раypal admin' }
] as const;

export type AttackDemoId = typeof ATTACK_DEMOS[number]['id'];

export function readHardeningReceipt(payload: unknown): HardeningReceipt | undefined {
  for (let depth = 0; depth < 4; depth++) {
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { return undefined; }
    }
    if (!payload || typeof payload !== 'object') { return undefined; }
    const record = payload as Record<string, unknown>;
    const receipt = record['hardening'] as Record<string, unknown> | undefined;
    if (receipt && typeof receipt['enabled'] === 'boolean' && typeof receipt['blocked'] === 'boolean' &&
        typeof receipt['model_called'] === 'boolean') {
      if (receipt['blocked'] && (receipt['model_called'] || !receipt['enabled'])) { return undefined; }
      return {
        enabled: receipt['enabled'], blocked: receipt['blocked'], model_called: receipt['model_called'],
        changed: receipt['changed'] === true,
        library_version: typeof receipt['library_version'] === 'string' ? receipt['library_version'] : undefined,
        policy: typeof receipt['policy'] === 'string' ? receipt['policy'] : undefined,
        action: typeof receipt['action'] === 'string' ? receipt['action'] : undefined,
        reason_codes: Array.isArray(receipt['reason_codes'])
          ? receipt['reason_codes'].filter((value): value is string => typeof value === 'string') : []
      };
    }
    payload = record['body'];
  }
  return undefined;
}
