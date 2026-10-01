import { ChatToolActivity, ChatTurn } from './chat.models';

/** Labels describe server-confirmed tool activity; no inferred or timed steps. */
export function toolActivityLabel(tool: ChatToolActivity, turnStatus?: ChatTurn['status']): string {
  const labels: Record<ChatToolActivity['name'], string> = {
    calculator: 'Calculator', site_profile: 'Public profile', source_lookup:
      tool.route === 'trusted_index' ? 'Selected sources' : tool.route === 'web' ? 'Web search' : 'Source lookup',
    memory_lookup: 'Personal memory', memory_write: 'Memory update', python: 'Python sandbox',
    repository_read: 'Repository read', review_check: 'Review validation',
    intent_routing: 'Intent routing', source_ranking: 'Source ranking', answer_check: 'Answer support check',
  };
  const label = labels[tool.name];
  if (tool.name === 'memory_write' && tool.status === 'complete') return 'Memory updated';
  if (tool.name === 'repository_read' && tool.status === 'complete') return 'Repository excerpts read';
  if (tool.name === 'review_check' && tool.status === 'complete') return 'Selection and citations checked';
  if (tool.name === 'review_check' && tool.status === 'failed') return 'Model prioritization unavailable';
  if (['intent_routing', 'source_ranking', 'answer_check'].includes(tool.name) && tool.status === 'complete')
    return `${label} completed`;
  const interrupted = turnStatus && !['waiting', 'streaming'].includes(turnStatus);
  return `${label} ${tool.status === 'running' ? interrupted ? 'interrupted' : 'running…' : tool.status === 'complete' ? 'used' :
    tool.status === 'unavailable' ? 'unavailable' : 'failed'}${tool.cached ? ' · cached lookup' : ''}`;
}
