import { TestBed } from '@angular/core/testing';
import { CHAT_ACCESS_TOKEN, CHAT_ENDPOINT, CHAT_FETCH, ChatEvent, ChatService } from './chat.service';
import { decodeRate } from './chat.models';
import { EventStreamParser } from './event-stream';

const meta = {
  model: 'gobwen-flash',
  servedModel: 'Qwen/Qwen3.5-0.8B',
  startState: 'warm',
  hardening: {
    enabled: true,
    blocked: false,
    changed: false,
    model_called: false,
    library_version: '3.0.0',
    policy: 'balanced_chat',
  },
};
const frame = (event: string, data: unknown) =>
  `event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
const response = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );
};
describe('Protected chat stream', () => {
  let request: jasmine.Spy;
  beforeEach(() => {
    request = jasmine.createSpy('fetch');
    TestBed.configureTestingModule({
      providers: [
        { provide: CHAT_ENDPOINT, useValue: 'https://gateway.example/chat' },
        { provide: CHAT_FETCH, useValue: request },
        { provide: CHAT_ACCESS_TOKEN, useValue: async () => 'test-access-token' },
      ],
    });
  });
  const run = (events: ChatEvent[]) =>
    TestBed.inject(ChatService).stream(
      'gobwen-flash',
      [{ role: 'user', content: 'Hello' }],
      new AbortController().signal,
      (event) => events.push(event),
    );
  it('does not send or fabricate an answer without a connected endpoint', async () => {
    TestBed.overrideProvider(CHAT_ENDPOINT, { useValue: '' });
    await expectAsync(run([])).toBeRejectedWithError(/hasn’t been sent/);
    expect(request).not.toHaveBeenCalled();
  });
  it('assembles split UTF-8/SSE events and reports actual token metrics', async () => {
    request.and.resolveTo(
      response(
        frame('meta', meta) +
          frame('delta', { text: 'Hello 🌿', channel: 'answer' }) +
          frame('done', { outputTokens: 6, decodeMs: 500 }),
      ),
    );
    const events: ChatEvent[] = [];
    await run(events);
    expect(events[0]).toEqual({ type: 'ready', servedModel: 'Qwen/Qwen3.5-0.8B' });
    expect(events[1]).toEqual({ type: 'delta', text: 'Hello 🌿', channel: 'answer' });
    const done = events[2];
    expect(done.type).toBe('done');
    if (done.type === 'done') {
      expect(done.metrics.tokensPerSecond).toBe(10);
      expect(done.metrics.startState).toBe('warm');
      expect(done.metrics.ttftMs).not.toBeNull();
      expect(done.metrics.totalMs).toBeGreaterThanOrEqual(done.metrics.ttftMs!);
    }
    expect(JSON.parse(request.calls.mostRecent().args[1].body).model).toBe('gobwen-flash');
    expect(request.calls.mostRecent().args[1].headers.Authorization).toBe('Bearer test-access-token');
    expect(JSON.parse(request.calls.mostRecent().args[1].body).captureConversation).toBeUndefined();
  });
  it('accepts bounded source links only after protection and rejects executable URLs', async () => {
    const done = frame('done', { outputTokens: 0, decodeMs: null });
    request.and.resolveTo(response(frame('meta', meta) + frame('sources', {
      sources: [{ id: 1, title: 'Omarchy', url: 'https://omarchy.org/' }],
    }) + done));
    const events: ChatEvent[] = [];
    await run(events);
    expect(events[1]).toEqual({ type: 'sources', sources: [{ id: 1, title: 'Omarchy', url: 'https://omarchy.org/' }] });
    request.and.resolveTo(response(frame('meta', meta) + frame('sources', {
      sources: [{ id: 1, title: 'bad', url: 'javascript:alert(1)' }],
    }) + done));
    await expectAsync(run([])).toBeRejectedWithError(/URL/);
  });
  it('sends explicit recording choice and reports a failed save honestly', async () => {
    request.and.resolveTo(response(frame('meta', meta) + frame('delta', { text: 'Hi', channel: 'answer' }) +
      frame('done', { outputTokens: 1, decodeMs: null, recording: { archive: 'unavailable', langwatch: 'unavailable' } })));
    const events: ChatEvent[] = [];
    await TestBed.inject(ChatService).stream('gobwen-flash', [{ role: 'user', content: 'Hi' }], new AbortController().signal,
      event => events.push(event), { conversationId: 'd6f009db-3715-45ca-86e1-7b2c10150640', captureConversation: true });
    expect(JSON.parse(request.calls.mostRecent().args[1].body).captureConversation).toBeTrue();
    const done = events[events.length - 1];
    if (done.type !== 'done') fail('Expected completion');
    else {
      expect(done.recordingNotice).toBe('Conversation recording failed');
      expect(done.metrics.firstAnswerMs).not.toBeNull();
    }
  });
  it('does not invoke the gateway without a signed-in token', async () => {
    TestBed.overrideProvider(CHAT_ACCESS_TOKEN, { useValue: async () => '' });
    await expectAsync(run([])).toBeRejectedWithError(/Sign in/);
    expect(request).not.toHaveBeenCalled();
  });
  it('uses native engine timing and surfaces response length limits', async () => {
    request.and.resolveTo(response(frame('meta', meta) + frame('done', {
      outputTokens: 128, decodeMs: 5000, engineTokensPerSecond: 35.5, finishReason: 'length',
    })));
    const events: ChatEvent[] = [];
    await run(events);
    const done = events[1];
    if (done.type === 'done') {
      expect(done.metrics.tokensPerSecond).toBe(35.5);
      expect(done.finishReason).toBe('length');
    } else fail('missing completion');
  });
  it('distinguishes daily allowance exhaustion from model concurrency', async () => {
    request.and.resolveTo(new Response(JSON.stringify({ error: 'daily_limit' }), { status: 429 }));
    await expectAsync(run([])).toBeRejectedWithError(/20 requests/);
  });
  it('never displays model output before the server guard receipt', async () => {
    request.and.resolveTo(response(frame('delta', { text: 'unguarded', channel: 'answer' })));
    const events: ChatEvent[] = [];
    await expectAsync(run(events)).toBeRejectedWithError(/before a valid/);
    expect(events).toEqual([]);
  });
  it('rejects disabled guards, late checks, wrong model identity and contradictory receipts', async () => {
    for (const change of [
      { model: 'goblin' },
      { hardening: { ...meta.hardening, enabled: false } },
      { hardening: { ...meta.hardening, model_called: true } },
      { hardening: { ...meta.hardening, blocked: true } },
    ]) {
      request.and.resolveTo(response(frame('meta', { ...meta, ...change })));
      await expectAsync(run([])).toBeRejectedWithError(/could not be verified/);
    }
  });
  it('handles a verified block without calling it a model response', async () => {
    request.and.resolveTo(
      response(frame('blocked', { hardening: { ...meta.hardening, blocked: true } })),
    );
    const events: ChatEvent[] = [];
    await run(events);
    expect(events).toEqual([{ type: 'blocked' }]);
  });
  it('keeps unknown cold/warm state unclassified and missing decode timings unestimated', async () => {
    request.and.resolveTo(
      response(
        frame('meta', { ...meta, startState: 'unknown' }) +
          frame('delta', { text: 'A', channel: 'reasoning' }) +
          frame('done', { outputTokens: 1, decodeMs: null }),
      ),
    );
    const events: ChatEvent[] = [];
    await run(events);
    const done = events[2];
    if (done.type === 'done') {
      expect(done.metrics.startState).toBe('unknown');
      expect(done.metrics.tokensPerSecond).toBeNull();
    } else fail('missing completion');
  });
  it('rejects truncated streams instead of marking a partial answer complete', async () => {
    request.and.resolveTo(
      response(frame('meta', meta) + frame('delta', { text: 'partial', channel: 'answer' })),
    );
    await expectAsync(run([])).toBeRejectedWithError(/before the answer was complete/);
  });
  it('does not count chunks as tokens or divide by a zero decode duration', () => {
    expect(decodeRate(1, 100)).toBeNull();
    expect(decodeRate(10, 0)).toBeNull();
    expect(decodeRate(2.5, 10)).toBeNull();
    expect(decodeRate(51, 500)).toBe(100);
    const parser = new EventStreamParser();
    expect(parser.push(': keep-alive\n\n')).toEqual([]);
    expect(() => parser.push('x'.repeat(1_048_577))).toThrow();
  });
});
