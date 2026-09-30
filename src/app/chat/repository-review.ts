import { ChatToolActivity, MemoryRecall, RepositoryReview } from './chat.models';

export function isRepositoryReview(prompt: string): boolean {
  return /^\s*review\s+(?:the\s+)?(?:website\s+)?repository(?:\s*:\s*([\s\S]{0,1500}))?\s*[.!]?\s*$/i.test(prompt);
}
export function readRepositoryReview(value: unknown, tools: ReadonlyMap<ChatToolActivity['name'], ChatToolActivity['status']>): RepositoryReview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The repository review receipt is invalid.');
  const data = value as Record<string, unknown>;
  const files = data['filesRead'];
  if (data['repository'] !== 'webstarcloud/webstarcloud.com' || data['mode'] !== 'guided' || typeof data['revision'] !== 'string' || !/^[a-f0-9]{40}$/.test(data['revision']) ||
      !Array.isArray(files) || !files.length || files.length > 3 || !files.every(path => typeof path === 'string' && path.length <= 240 &&
        /^[A-Za-z0-9._/-]+$/.test(path) && !path.split('/').some(part => !part || part === '.' || part === '..')) ||
      new Set(files).size !== files.length || data['partial'] !== true || data['testsRun'] !== false ||
      !Number.isSafeInteger(data['findingsReported']) || (data['findingsReported'] as number) < 0 || (data['findingsReported'] as number) > 3 ||
      (data['attempts'] !== 0 && data['attempts'] !== 1 && data['attempts'] !== 2) || !['checked', 'invalid'].includes(String(data['status'])) ||
      tools.get('repository_read') !== 'complete' ||
      tools.get('review_check') !== (data['status'] === 'checked' ? 'complete' : 'failed'))
    throw new Error('The repository review receipt could not be verified.');
  return { repository: 'webstarcloud/webstarcloud.com', mode: 'guided', revision: data['revision'], filesRead: files, partial: true, testsRun: false,
    findingsReported: data['findingsReported'] as number, attempts: data['attempts'] as RepositoryReview['attempts'], status: data['status'] as RepositoryReview['status'] };
}
export function readMemoryRecall(value: unknown, enabled: boolean, tools: ReadonlyMap<ChatToolActivity['name'], ChatToolActivity['status']>): MemoryRecall {
  const status = tools.get('memory_lookup');
  if (typeof value !== 'string' || !['off', 'skipped_irrelevant', 'used', 'unavailable'].includes(value) ||
      (value !== 'off' && !enabled) || (value === 'off' && status !== undefined) ||
      (value === 'skipped_irrelevant' && status !== undefined) ||
      (value === 'used' && status !== 'complete') || (value === 'unavailable' && !['failed', 'unavailable'].includes(String(status))))
    throw new Error('The personal-memory recall receipt is invalid.');
  return value as MemoryRecall;
}
