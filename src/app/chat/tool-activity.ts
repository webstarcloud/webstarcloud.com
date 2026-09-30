import { ChatToolActivity, ChatTurn } from './chat.models';

/** Labels describe server-confirmed tool activity; no inferred or timed steps. */
export function toolActivityLabel(tool: ChatToolActivity, turnStatus?: ChatTurn['status']): string {
  const label = tool.name === 'calculator' ? 'Calculator' : tool.name === 'site_profile' ? 'Public profile' :
    tool.route === 'trusted_index' ? 'Selected sources' : tool.route === 'web' ? 'Web search' : 'Source lookup';
  const interrupted = turnStatus && !['waiting', 'streaming'].includes(turnStatus);
  return `${label} ${tool.status === 'running' ? interrupted ? 'interrupted' : 'running…' : tool.status === 'complete' ? 'used' :
    tool.status === 'unavailable' ? 'unavailable' : 'failed'}`;
}
