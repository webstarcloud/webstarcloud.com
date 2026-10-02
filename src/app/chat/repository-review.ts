import { ChatToolActivity, MemoryRecall, RepositoryReview } from './chat.models';

const WEBSITE_REPOSITORY = 'webstarcloud/webstarcloud.com';
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPOSITORY = /^[A-Za-z0-9._-]{1,100}$/;
const REVIEW_PREFIX = /^\s*review\s+(?:the\s+)?(?:website\s+)?repository\b/i;
const URL_START = /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|https?[:/]|github\.com\b)/i;
const URL_LOOKING = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:www\.)?(?:github|gitlab|bitbucket)\.com(?:\/|\b)|git@|(?:^|\s)\/\/)/i;
const repositoryName = (value: unknown): value is string => typeof value === 'string' &&
  value.split('/').length === 2 && OWNER.test(value.split('/')[0]) && REPOSITORY.test(value.split('/')[1]) &&
  !['.', '..'].includes(value.split('/')[1]);

export function isRepositoryReview(prompt: string): boolean {
  return REVIEW_PREFIX.test(prompt);
}
/** Invalid URL-looking targets stay review requests but have no admissible repository. */
export function parseReviewTarget(prompt: string): string | null {
  return parseReviewRequest(prompt)?.repository ?? null;
}
export function parseReviewRequest(prompt: string): { repository: string; focus: string } | null {
  const prefix = REVIEW_PREFIX.exec(prompt);
  if (!prefix) return null;
  const tail = prompt.slice(prefix[0].length).trim();
  if (['', '.', '!'].includes(tail)) return { repository: WEBSITE_REPOSITORY, focus: '' };
  if (!tail.startsWith(':')) return null;
  const body = tail.slice(1).trim();
  if (body.length > 1700 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body)) return null;
  if (!URL_START.test(body)) return URL_LOOKING.test(body) || body.length > 1500 ? null : { repository: WEBSITE_REPOSITORY, focus: body };
  const target = /^(\S+)(?:\s+:\s*([\s\S]*))?$/.exec(body);
  const focus = target?.[2]?.trim() ?? '';
  if (!target || focus.length > 1500 || URL_LOOKING.test(focus)) return null;
  const url = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i.exec(target[1]);
  if (!url) return null;
  const name = `${url[1]}/${url[2].replace(/\.git$/, '')}`;
  return repositoryName(name) ? { repository: name, focus } : null;
}
export function isRepositoryPath(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 160 && /^[A-Za-z0-9._/-]+$/.test(value) &&
    value.split('/').every(part => Boolean(part) && !part.startsWith('.'));
}
export function repositorySourceRevision(value: string, expectedRepository: string | null): string | null {
  if (!expectedRepository || !repositoryName(expectedRepository)) return null;
  const prefix = /^https:\/\/github\.com\//i.exec(value);
  if (!prefix) return null;
  const pinned = /^([^/]+\/[^/]+)\/blob\/([a-f0-9]{40})\/([^?#]+)#L([1-9]\d{0,5})(?:-L([1-9]\d{0,5}))?$/.exec(value.slice(prefix[0].length));
  if (!pinned || pinned[1].toLowerCase() !== expectedRepository.toLowerCase() || !isRepositoryPath(pinned[3]) ||
      (pinned[5] !== undefined && Number(pinned[5]) < Number(pinned[4]))) return null;
  return pinned[2];
}
export function readRepositoryReview(value: unknown, tools: ReadonlyMap<ChatToolActivity['name'], ChatToolActivity['status']>, expectedRepository: string | null = WEBSITE_REPOSITORY): RepositoryReview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The repository review receipt is invalid.');
  const data = value as Record<string, unknown>;
  const files = data['filesRead'];
  if (!expectedRepository || !repositoryName(data['repository']) || data['repository'].toLowerCase() !== expectedRepository.toLowerCase() ||
      data['mode'] !== 'guided' || typeof data['revision'] !== 'string' || !/^[a-f0-9]{40}$/.test(data['revision']) ||
      !Array.isArray(files) || !files.length || files.length > 3 || !files.every(isRepositoryPath) ||
      new Set(files).size !== files.length || data['partial'] !== true || data['testsRun'] !== false ||
      !Number.isSafeInteger(data['findingsReported']) || (data['findingsReported'] as number) < 0 || (data['findingsReported'] as number) > 3 ||
      (data['attempts'] !== 0 && data['attempts'] !== 1 && data['attempts'] !== 2) || !['checked', 'invalid'].includes(String(data['status'])) ||
      tools.get('repository_read') !== 'complete' ||
      tools.get('review_check') !== (data['status'] === 'checked' ? 'complete' : 'failed'))
    throw new Error('The repository review receipt could not be verified.');
  return { repository: data['repository'], mode: 'guided', revision: data['revision'], filesRead: files, partial: true, testsRun: false,
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
