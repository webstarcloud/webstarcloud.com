import { conversationContext, restoreLoginDraft, saveLoginDraft } from './chat-context';
import { CHAT_MODELS, ChatModelId, ChatTurn, DEFAULT_CHAT_MODEL } from './chat.models';
const turn = (prompt: string, answer: string, model: ChatModelId = 'gobwen-flash'): ChatTurn => ({
  id: 1, prompt, answer, model: CHAT_MODELS.find(candidate => candidate.id === model)!,
  status: 'complete', guard: 'checked', reasoning: '',
});
describe('Small model conversation context', () => {
  it('retains whole pairs within the 6000-character budget', () => {
    const messages = conversationContext([turn('old', 'old'), turn('🌿'.repeat(1900), 'x'.repeat(1900))], 'a'.repeat(2000), 'gobwen-flash');
    expect(messages.length).toBe(5);
    expect(messages.reduce((total, message) => total + [...message.content].length, 0)).toBe(5806);
    expect(conversationContext([turn('older', 'older'), turn('x'.repeat(2000), 'a'.repeat(2000))], 'p'.repeat(2000), 'gobwen-flash').length).toBe(3);
  });
  it('omits unsupported or empty exchanges and sends Goblin only the latest prompt', () => {
    expect(conversationContext([turn('q', '')], 'hi', 'gobwen-flash').length).toBe(1);
    expect(conversationContext([turn('q', 'x'.repeat(2001))], 'hi', 'gobwen-flash').length).toBe(1);
    expect(conversationContext([turn('q', 'a')], 'hi', 'goblin')).toEqual([{ role: 'user', content: 'hi' }]);
  });
  it('excludes a failed repetitive answer from subsequent model context', () => {
    const failed = { ...turn('question', 'Repeated partial answer'), status: 'error' as const };
    expect(conversationContext([turn('earlier', 'Safe answer'), failed], 'Continue', 'gobwen-flash')).toEqual([
      { role: 'user', content: 'earlier' }, { role: 'assistant', content: 'Safe answer' },
      { role: 'user', content: 'Continue' },
    ]);
  });
  it('defaults to Think and carries forward only completed exchanges from that model', () => {
    expect(DEFAULT_CHAT_MODEL).toBe('gobwen-think');
    expect(conversationContext([
      turn('Think question', 'Think answer', 'gobwen-think'),
      turn('Flash question', 'Flash answer'),
      turn('Base prompt', 'Base continuation', 'goblin'),
    ], 'Continue', DEFAULT_CHAT_MODEL)).toEqual([
      { role: 'user', content: 'Think question' },
      { role: 'assistant', content: 'Think answer' },
      { role: 'user', content: 'Continue' },
    ]);
  });
  it('restores the sign-in draft once and discards expired or corrupt values', () => {
    const values = new Map<string, string>();
    const storage = { setItem: (key: string, value: string) => values.set(key, value), getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key) };
    expect(saveLoginDraft('Keep me', 'goblin', storage)).toBeTrue();
    expect(restoreLoginDraft(storage)).toEqual({ draft: 'Keep me', model: 'goblin' });
    expect(restoreLoginDraft(storage)).toBeNull();
    expect(saveLoginDraft('Keep thinking', DEFAULT_CHAT_MODEL, storage)).toBeTrue();
    expect(restoreLoginDraft(storage)).toEqual({ draft: 'Keep thinking', model: 'gobwen-think' });
    values.set('gobwen.login-draft', '{broken');
    expect(restoreLoginDraft(storage)).toBeNull();
    values.set('gobwen.login-draft', JSON.stringify({ draft: 'old', model: 'goblin', expires: 1 }));
    expect(restoreLoginDraft(storage)).toBeNull();
    values.set('gobwen.login-draft', JSON.stringify({ draft: 'unknown', model: 'unknown', expires: Date.now() + 300_000 }));
    expect(restoreLoginDraft(storage)).toBeNull();
  });
});
