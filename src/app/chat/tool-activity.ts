import { ChatToolActivity, ChatTurn } from './chat.models';

/** Labels describe server-confirmed tool activity; no inferred or timed steps. */
export function toolActivityLabel(tool: ChatToolActivity, turnStatus?: ChatTurn['status']): string {
  const labels: Record<ChatToolActivity['name'], string> = {
    calculator: 'Calculator', site_profile: 'Public profile', source_lookup:
      tool.route === 'trusted_index' ? 'Selected sources' : tool.route === 'web' ? 'Web search' : 'Source lookup',
    memory_lookup: 'Personal memory', memory_write: 'Memory update', python: 'Python sandbox',
  };
  const label = labels[tool.name];
  if (tool.name === 'memory_write' && tool.status === 'complete') return 'Memory updated';
  const interrupted = turnStatus && !['waiting', 'streaming'].includes(turnStatus);
  return `${label} ${tool.status === 'running' ? interrupted ? 'interrupted' : 'running…' : tool.status === 'complete' ? 'used' :
    tool.status === 'unavailable' ? 'unavailable' : 'failed'}`;
}
