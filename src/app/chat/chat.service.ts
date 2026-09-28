import { Injectable, InjectionToken, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { readHardeningReceipt } from '../particles/chat-hardening';
import { ChatMessage, ChatMetrics, ChatModelId, ChatSource, decodeRate } from './chat.models';
import { EventStreamParser } from './event-stream';
import { AuthService } from '../auth/auth.service';

export const CHAT_ENDPOINT = new InjectionToken<string>('Chat gateway endpoint', {
  providedIn: 'root',
  factory: () => environment.chatEndpoint,
});
export const CHAT_FETCH = new InjectionToken<typeof fetch>('Chat fetch', {
  providedIn: 'root',
  factory: () => fetch.bind(window),
});
export const CHAT_ACCESS_TOKEN = new InjectionToken<() => Promise<string>>('Chat access token', {
  providedIn: 'root',
  factory: () => {
    const auth = inject(AuthService);
    return () => auth.getAccessToken();
  },
});
export type ChatEvent =
  | { type: 'ready'; servedModel: string; contextNotice?: string }
  | { type: 'delta'; text: string; channel: 'answer' | 'reasoning' }
  | { type: 'blocked' }
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'done'; metrics: ChatMetrics; finishReason?: string; recordingNotice?: string };
const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('The chat service returned an invalid event.');
  return value as Record<string, unknown>;
};

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly endpoint = inject(CHAT_ENDPOINT).trim();
  private readonly request = inject(CHAT_FETCH);
  private readonly accessToken = inject(CHAT_ACCESS_TOKEN);
  get configured(): boolean {
    return Boolean(this.endpoint);
  }

  async stream(
    model: ChatModelId,
    messages: ChatMessage[],
    signal: AbortSignal,
    onEvent: (event: ChatEvent) => void,
    recording?: { conversationId: string; captureConversation: boolean },
  ): Promise<void> {
    if (!this.configured)
      throw new Error('The model isn’t connected yet. Your message hasn’t been sent.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    const timeout = setTimeout(abort, 150_000);
    const started = performance.now();
    let firstOutput: number | null = null;
    let firstAnswer: number | null = null;
    let state: ChatMetrics['startState'] = 'unknown';
    let checked = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let outputLength = 0;
    try {
      const token = await this.accessToken();
      if (!token) throw new Error('Sign in with Google to chat. Your message hasn’t been sent.');
      const response = await this.request(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ model, messages, stream: true, ...recording }),
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        const messages: Record<string, string> = {
          daily_limit: 'You’ve used today’s 20 requests. Come back after midnight UTC.',
          preview_capacity: 'Today’s shared preview allowance is used up. Come back after midnight UTC.',
          slow_down: 'Please wait a minute before sending another message.',
          preview_busy: 'The shared preview is busy. Please wait a minute.',
        };
        throw new Error(response.status === 401 ? 'Your session has expired. Sign out and sign in again to continue.'
          : response.status === 429 ? messages[failure?.error] ?? 'This model is busy. Try another model or wait a minute.'
          : response.status === 400 ? 'This conversation is too long for the small model. Start a new chat.'
          : 'The model is unavailable. Please try again shortly.');
      }
      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream'))
        throw new Error('This endpoint does not provide the expected protected chat stream.');
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new EventStreamParser();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error('The connection ended before the answer was complete.');
        for (const frame of parser.push(decoder.decode(chunk.value, { stream: true }))) {
          const data = asRecord(frame.data);
          if (frame.event === 'blocked') {
            const receipt = readHardeningReceipt(data);
            if (checked || !receipt?.enabled || !receipt.blocked || receipt.model_called)
              throw new Error('The input protection receipt could not be verified.');
            onEvent({ type: 'blocked' });
            return;
          }
          if (frame.event === 'meta') {
            const receipt = readHardeningReceipt(data);
            if (
              checked ||
              data['model'] !== model ||
              typeof data['servedModel'] !== 'string' ||
              !data['servedModel'] ||
              !receipt?.enabled ||
              receipt.blocked ||
              receipt.model_called ||
              !['cold', 'warm', 'unknown'].includes(String(data['startState']))
            ) {
              throw new Error(
                'The model identity or input protection receipt could not be verified.',
              );
            }
            const dropped = asRecord(data['hardening'])['history_pairs_dropped'] ?? 0;
            if (!Number.isSafeInteger(dropped) || (dropped as number) < 0 || (dropped as number) > 10)
              throw new Error('The context protection receipt could not be verified.');
            checked = true;
            state = data['startState'] as ChatMetrics['startState'];
            onEvent({ type: 'ready', servedModel: data['servedModel'],
              ...(dropped ? { contextNotice: 'Some earlier context was left out because input protection flagged a previous reply.' } : {}),
            });
          } else if (frame.event === 'sources') {
            if (!checked || !Array.isArray(data['sources']) || data['sources'].length > 3)
              throw new Error('The search sources are invalid.');
            const sources = data['sources'].map((value: unknown, index: number) => {
              const source = asRecord(value);
              if (source['id'] !== index + 1 || typeof source['title'] !== 'string' ||
                  source['title'].length > 120 || typeof source['url'] !== 'string' || source['url'].length > 1500)
                throw new Error('The search sources are invalid.');
              const url = new URL(source['url']);
              if (url.protocol !== 'https:' || url.username || url.password)
                throw new Error('The search source URL is invalid.');
              const kind = source['kind'];
              const indexedAt = source['indexedAt'];
              if (kind !== undefined && kind !== 'indexed' && kind !== 'web')
                throw new Error('The search source type is invalid.');
              if (kind === 'indexed' && (typeof indexedAt !== 'string' || indexedAt.length > 40 || !Number.isFinite(Date.parse(indexedAt))))
                throw new Error('The indexed source date is invalid.');
              return { id: index + 1, title: source['title'], url: url.href,
                ...(kind ? { kind: kind as 'indexed' | 'web' } : {}),
                ...(kind === 'indexed' ? { indexedAt: indexedAt as string } : {}),
              };
            });
            onEvent({ type: 'sources', sources });
          } else if (frame.event === 'delta') {
            if (
              !checked ||
              typeof data['text'] !== 'string' ||
              !['answer', 'reasoning'].includes(String(data['channel']))
            )
              throw new Error('The service sent output before a valid protection check.');
            if (!data['text']) continue;
            outputLength += data['text'].length;
            if (outputLength > 100_000) throw new Error('The response exceeded the display limit.');
            firstOutput ??= performance.now();
            if (data['channel'] === 'answer') firstAnswer ??= performance.now();
            onEvent({
              type: 'delta',
              text: data['text'],
              channel: data['channel'] as 'answer' | 'reasoning',
            });
          } else if (frame.event === 'done') {
            const count = data['outputTokens'];
            const decodeMs = data['decodeMs'];
            const input = data['inputTokens'];
            const called = data['modelCalled'];
            const modelMs = data['modelDurationMs'];
            const bypass = data['modelBypass'];
            if (
              !checked ||
              !Number.isSafeInteger(count) ||
              (count as number) < 0 ||
              (decodeMs !== null &&
                (typeof decodeMs !== 'number' || !Number.isFinite(decodeMs) || decodeMs < 0))
            )
              throw new Error('The response metrics are invalid.');
            if ((input != null && (!Number.isSafeInteger(input) || (input as number) < 0)) ||
                (called !== undefined && typeof called !== 'boolean') ||
                (modelMs !== undefined && (typeof modelMs !== 'number' || !Number.isFinite(modelMs) || modelMs < 0 || modelMs > 120_000)) ||
                (bypass != null && !['calculator', 'source_excerpts', 'site_profile'].includes(String(bypass))) ||
                (bypass != null && called !== false) ||
                (called === false && (count !== 0 || input !== 0 || modelMs !== 0)))
              throw new Error('The model usage receipt could not be verified.');
            onEvent({
              type: 'done',
              finishReason: typeof data['finishReason'] === 'string' ? data['finishReason'] : undefined,
              recordingNotice: recording?.captureConversation
                ? (data['recording'] && asRecord(data['recording'])['archive'] === 'saved'
                  ? 'Saved for research · awaiting review'
                  : data['recording'] && asRecord(data['recording'])['langwatch'] === 'sent'
                    ? 'Saved in LangWatch · archive unavailable'
                    : 'Conversation recording failed') : undefined,
              metrics: {
                startState: state,
                ttftMs: firstOutput === null ? null : firstOutput - started,
                firstAnswerMs: firstAnswer === null ? null : firstAnswer - started,
                tokensPerSecond: typeof data['engineTokensPerSecond'] === 'number' &&
                  Number.isFinite(data['engineTokensPerSecond']) && data['engineTokensPerSecond'] > 0
                  ? data['engineTokensPerSecond'] : decodeRate(count as number, decodeMs as number | null),
                totalMs: performance.now() - started,
                outputTokens: count as number,
                ...(input !== undefined ? { inputTokens: input as number | null } : {}),
                ...(called !== undefined ? { modelCalled: called as boolean } : {}),
                ...(modelMs !== undefined ? { modelDurationMs: modelMs as number } : {}),
                ...(bypass != null ? { modelBypass: bypass as 'calculator' | 'source_excerpts' | 'site_profile' } : {}),
              },
            });
            return;
          } else if (frame.event === 'error') {
            if (data['code'] === 'repetition')
              throw new Error('The model got stuck repeating, so generation was stopped. This partial answer may be wrong and won’t be used in your next message.');
            throw new Error('The model stopped unexpectedly. You can try the request again.');
          } else {
            throw new Error('The chat service sent an unsupported event.');
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted && !signal.aborted)
        throw new Error('The model took too long to respond. Please try again.');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      try {
        await reader?.cancel();
      } catch {
        /* The connection may already be closed. */
      }
      reader?.releaseLock();
    }
  }
}
