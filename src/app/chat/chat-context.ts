import { CHAT_MODELS, ChatMessage, ChatModelId, ChatTurn } from './chat.models';

/** Keep whole recent exchanges within the server's Unicode character budget. */
export function conversationContext(turns: ChatTurn[], prompt: string, model: ChatModelId): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  if (model === 'goblin') return messages; // Base continuation model has no chat template.
  let characters = [...prompt].length;
  for (const turn of [...turns].reverse()) {
    if (turn.status !== 'complete' || turn.model.id !== model) continue;
    const userSize = [...turn.prompt].length;
    const answerSize = [...turn.answer].length;
    if (!turn.answer.trim() || userSize > 2000 || answerSize > 2000) break;
    if (messages.length + 2 > 21 || characters + userSize + answerSize > 6000) break;
    messages.unshift({ role: 'user', content: turn.prompt }, { role: 'assistant', content: turn.answer });
    characters += userSize + answerSize;
  }
  return messages;
}

const DRAFT_KEY = 'gobwen.login-draft';
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function saveLoginDraft(draft: string, model: ChatModelId, storage?: DraftStorage): boolean {
  try {
    (storage ?? sessionStorage).setItem(DRAFT_KEY, JSON.stringify({ draft: [...draft].slice(0, 2000).join(''), model, expires: Date.now() + 600_000 }));
    return true;
  } catch { return false; }
}
export function restoreLoginDraft(storage?: DraftStorage): { draft: string; model: ChatModelId } | null {
  try {
    const store = storage ?? sessionStorage;
    const raw = store.getItem(DRAFT_KEY);
    store.removeItem(DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value.draft === 'string' && [...value.draft].length <= 2000 &&
      Number.isFinite(value.expires) && value.expires > Date.now() && value.expires <= Date.now() + 600_000 &&
      (value.model === 'goblin' || CHAT_MODELS.some(model => model.id === value.model))
      ? { draft: value.draft, model: value.model === 'goblin' ? 'gobwen-flash' : value.model } : null;
  } catch { return null; }
}
