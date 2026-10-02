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
    name: 'Assistant',
    mode: 'Flash',
    description: 'Everyday questions. A direct answer.',
    source: 'Qwen3.5-0.8B · non-thinking',
    experimental: false,
  },
  {
    id: 'gobwen-think',
    name: 'Assistant',
    mode: 'Think',
    description: 'Take a little more time with a problem.',
    source: 'Qwen3.5-0.8B · thinking',
    experimental: false,
  },
  {
    id: 'goblin',
    name: 'Goblin',
    mode: 'Base',
    description: 'A nanoGPT experiment. Try a text continuation.',
    source: '248M parameters · trained from scratch',
    experimental: true,
  },
];
export const DEFAULT_CHAT_MODEL: ChatModelId = 'gobwen-think';

export interface ChatToolActivity {
  name: 'calculator' | 'source_lookup' | 'site_profile' | 'memory_lookup' | 'memory_write' | 'python' | 'repository_read' | 'review_check' | 'intent_routing' | 'source_ranking' | 'answer_check';
  status: 'running' | 'complete' | 'failed' | 'unavailable';
  route?: 'trusted_index' | 'web';
  cached?: boolean;
}
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatRequestOptions {
  conversationId: string;
  captureConversation: boolean;
  useMemory?: boolean;
  useSandbox?: boolean;
}
export interface ChatMetrics {
  startState: 'cold' | 'warm' | 'unknown';
  ttftMs: number | null;
  tokensPerSecond: number | null;
  totalMs: number;
  outputTokens: number;
  inputTokens?: number | null;
  modelCalled?: boolean;
  modelDurationMs?: number;
  modelBypass?: 'calculator' | 'source_excerpts' | 'site_profile' | 'memory_lookup' | 'memory_write' | 'python' | 'clarification';
  firstAnswerMs?: number | null;
}
export interface ChatSource { id: number; title: string; url: string; kind?: 'indexed' | 'web' | 'repository'; indexedAt?: string; revision?: string }
export type MemoryRecall = 'off' | 'skipped_irrelevant' | 'used' | 'unavailable';
export interface RepositoryReview {
  repository: string;
  mode: 'guided';
  revision: string;
  filesRead: string[];
  partial: true;
  testsRun: false;
  findingsReported: number;
  attempts: 0 | 1 | 2;
  status: 'checked' | 'invalid';
}
export interface RequestMilestone { label: string; elapsedMs: number }
export interface ChatTurn {
  id: number;
  prompt: string;
  /** Consent at send time, not confirmation that a provider saved the turn. */
  captureRequested?: boolean;
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
  contextNotice?: string;
  tools?: ChatToolActivity[];
  review?: RepositoryReview;
  memoryRecall?: MemoryRecall;
  timeline?: RequestMilestone[];
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
