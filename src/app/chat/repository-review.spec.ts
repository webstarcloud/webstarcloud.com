import { ChatToolActivity, RepositoryReview } from './chat.models';
import { isRepositoryPath, isRepositoryReview, parseReviewRequest, parseReviewTarget, readRepositoryReview, repositorySourceRevision } from './repository-review';

describe('Public repository review boundary', () => {
  const revision = 'a'.repeat(40);
  const tools = new Map<ChatToolActivity['name'], ChatToolActivity['status']>([
    ['repository_read', 'complete'], ['review_check', 'complete'],
  ]);
  const review: RepositoryReview = { repository: 'pallets/flask', mode: 'guided', revision, filesRead: ['src/flask/app.py'],
    partial: true, testsRun: false, findingsReported: 1, attempts: 1, status: 'checked' };
  it('normalizes public root URLs and preserves legacy website focus', () => {
    for (const [prompt, repository, focus] of [
      ['Review the website repository', 'webstarcloud/webstarcloud.com', ''],
      ['Review repository: chat security', 'webstarcloud/webstarcloud.com', 'chat security'],
      ['Review repository: https://github.com/pallets/flask', 'pallets/flask', ''],
      ['Review repository: https://github.com/pallets/flask/ : routing', 'pallets/flask', 'routing'],
      ['Review repository: https://github.com/pallets/flask.git : routing', 'pallets/flask', 'routing'],
      ['Review repository: https://github.com/Owner-1/repo_name.v2', 'Owner-1/repo_name.v2', ''],
    ]) {
      expect(isRepositoryReview(prompt)).toBeTrue();
      expect(parseReviewTarget(prompt)).toBe(repository);
      expect(parseReviewRequest(prompt)).toEqual({ repository, focus });
    }
  });
  it('keeps malformed review targets on the review route while admitting no repository', () => {
    for (const target of [
      'http://github.com/pallets/flask', 'https://github.com:443/pallets/flask',
      'https://user@github.com/pallets/flask', 'https://github.com.evil.test/pallets/flask',
      'https://github.com/pallets/flask?token=synthetic', 'https://github.com/pallets/flask#readme',
      'https://github.com/pallets/flask/tree/main', 'https://github.com/pallets/%2e%2e',
      'https://github.com/-owner/repo', 'https://github.com/owner/..', 'github.com/pallets/flask',
      'https://127.0.0.1/owner/repo', 'security https://example.com', 'www.github.com/owner/repo',
      '//github.com/owner/repo', 'git@github.com:owner/repo', 'https://gitlab.com/owner/repo',
      'https://github.com/owner/repo : security https://example.com',
      `https://github.com/${'a'.repeat(40)}/repo`, `https://github.com/owner/${'a'.repeat(101)}`,
      'https://github.com/owner/.git', 'https://github.com/owner/repo//',
    ]) {
      const prompt = `Review repository: ${target}`;
      expect(isRepositoryReview(prompt)).toBeTrue();
      expect(parseReviewTarget(prompt)).withContext(target).toBeNull();
    }
    for (const prompt of ['review repository??', `review repository:${'a'.repeat(1501)}`, 'review repository: focus\u0000']) {
      expect(isRepositoryReview(prompt)).toBeTrue();
      expect(parseReviewTarget(prompt)).toBeNull();
    }
    expect(parseReviewRequest(`review repository:${'a'.repeat(1500)}`)?.focus.length).toBe(1500);
  });
  it('leaves ordinary conversation outside the explicit review command', () => {
    for (const prompt of ['Please review https://github.com/pallets/flask', 'Explain repository review', 'review repositories']) {
      expect(isRepositoryReview(prompt)).toBeFalse();
      expect(parseReviewTarget(prompt)).toBeNull();
    }
  });
  it('verifies the requested repository and safe paths before displaying its receipt', () => {
    expect(readRepositoryReview(review, tools, 'Pallets/Flask')).toEqual(review);
    expect(() => readRepositoryReview(review, tools, 'other/repo')).toThrowError(/receipt/);
    expect(() => readRepositoryReview(review, tools, null)).toThrowError(/receipt/);
    for (const path of ['.github/workflows/ci.yml', 'src/.secret', 'src/../app.py', 'src//app.py', 'src\\app.py', 'a'.repeat(161)])
      expect(() => readRepositoryReview({ ...review, filesRead: [path] }, tools, 'pallets/flask')).toThrowError(/receipt/);
    for (const path of ['README.md', 'src/main.rs', 'src/server.go', 'include/example.hpp', 'config/settings.yaml'])
      expect(isRepositoryPath(path)).toBeTrue();
  });
  it('accepts only pinned requested-repository sources with safe file paths and line anchors', () => {
    const prefix = `https://github.com/Pallets/Flask/blob/${revision}/`;
    expect(repositorySourceRevision(`${prefix}src/flask/app.py#L1-L20`, 'pallets/flask')).toBe(revision);
    expect(repositorySourceRevision(`${prefix}README.md#L1`, 'pallets/flask')).toBe(revision);
    for (const suffix of ['src/../app.py#L1', '.github/workflows/ci.yml#L1', 'src/%2e%2e/app.py#L1',
      'src/app.py?raw=1#L1', 'src/app.py#readme', 'src/app.py#L0', 'src/app.py#L20-L1', 'src/app.py'])
      expect(repositorySourceRevision(`${prefix}${suffix}`, 'pallets/flask')).withContext(suffix).toBeNull();
    expect(repositorySourceRevision(`${prefix}README.md#L1`, 'other/repo')).toBeNull();
    expect(repositorySourceRevision(`${prefix}README.md#L1`, null)).toBeNull();
  });
});
