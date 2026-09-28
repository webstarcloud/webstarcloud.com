export type ChatModelId = 'gobwen-flash' | 'gobwen-think' | 'goblin';
export interface ChatModel {
  id: ChatModelId;
  name: string;
  mode: string;
  description: string;
  source: string;
  experimental: boolean;
}
export const CHAT_MODELS: readonly ChatModel[] = [
  {
    id: 'gobwen-flash',
    name: 'Gobwen',
    mode: 'Flash',
    description: 'Everyday questions. A direct answer.',
    source: 'Qwen3.5-0.8B · non-thinking',
    experimental: false,
  },
  {
    id: 'gobwen-think',
    name: 'Gobwen',
    mode: 'Think',
    description: 'Take a little more time with a problem.',
    source: 'Qwen3.5-0.8B · thinking',
    experimental: false,
  },
  {
    id: 'goblin',
    name: 'Goblin',
    mode: 'Experimental',
    description: 'Our small base model. Expect gobbledygook.',
    source: 'goblin-250M · experimental base model',
    experimental: true,
  },
];
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatMetrics {
  startState: 'cold' | 'warm' | 'unknown';
  ttftMs: number | null;
  tokensPerSecond: number | null;
  totalMs: number;
  outputTokens: number;
  firstAnswerMs?: number | null;
}
export interface ChatSource { id: number; title: string; url: string }
export interface ChatTurn {
  id: number;
  prompt: string;
  answer: string;
  reasoning: string;
  model: ChatModel;
  status: 'waiting' | 'streaming' | 'complete' | 'stopped' | 'error' | 'blocked';
  guard: 'waiting' | 'checked' | 'blocked';
  error?: string;
  metrics?: ChatMetrics;
  servedModel?: string;
  finishReason?: string;
  sources?: ChatSource[];
  recordingNotice?: string;
}
export function decodeRate(outputTokens: number, decodeMs: number | null): number | null {
  return Number.isSafeInteger(outputTokens) &&
    outputTokens > 1 &&
    decodeMs !== null &&
    Number.isFinite(decodeMs) &&
    decodeMs > 0
    ? ((outputTokens - 1) * 1000) / decodeMs
    : null;
}
