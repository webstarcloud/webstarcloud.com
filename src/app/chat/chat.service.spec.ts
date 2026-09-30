import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { CHAT_ACCESS_TOKEN, CHAT_ENDPOINT, CHAT_FETCH, ChatEvent, ChatService } from './chat.service';
import { ChatRequestOptions, decodeRate } from './chat.models';
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
const controlledResponse = (
  prefix: string,
  next: () => Promise<ReadableStreamReadResult<Uint8Array>>,
  cancel: () => Promise<void> = async () => {},
) => {
  const reader = jasmine.createSpyObj<ReadableStreamDefaultReader<Uint8Array>>('reader', ['read', 'cancel', 'releaseLock']);
  let first = true;
  reader.read.and.callFake(() => {
    if (!first) return next();
    first = false;
    return Promise.resolve({ done: false, value: new TextEncoder().encode(prefix) });
  });
  reader.cancel.and.callFake(cancel);
  return { reader, response: { ok: true, headers: new Headers({ 'Content-Type': 'text/event-stream' }),
    body: { getReader: () => reader } } as unknown as Response };
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
  const run = (events: ChatEvent[], options?: ChatRequestOptions) =>
    TestBed.inject(ChatService).stream(
      'gobwen-flash',
      [{ role: 'user', content: 'Hello' }],
      new AbortController().signal,
      (event) => events.push(event),
      options,
    );
  it('does not send or fabricate an answer without a connected endpoint', async () => {
    TestBed.overrideProvider(CHAT_ENDPOINT, { useValue: '' });
    await expectAsync(run([])).toBeRejectedWithError(/hasn’t been sent/);
    expect(request).not.toHaveBeenCalled();
  });
  it('explains a detected output loop and never completes the partial answer', async () => {
    request.and.resolveTo(response(frame('meta', meta) +
      frame('delta', { text: 'Partial answer', channel: 'answer' }) +
      frame('error', { code: 'repetition', message: 'private detail must stay hidden' })));
    const events: ChatEvent[] = [];
    await expectAsync(run(events)).toBeRejectedWithError(/got stuck repeating/);
    expect(events.some(event => event.type === 'done')).toBeFalse();
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
    expect(JSON.parse(request.calls.mostRecent().args[1].body).useMemory).toBeUndefined();
    expect(JSON.parse(request.calls.mostRecent().args[1].body).useSandbox).toBeUndefined();
  });
  const experimentOptions: ChatRequestOptions = {
    conversationId: 'd6f009db-3715-45ca-86e1-7b2c10150640', captureConversation: false,
    useMemory: true, useSandbox: true,
  };
  it('sends explicit tool choices independently of research capture and never sends a provider identity', async () => {
    request.and.callFake(async () => response(frame('meta', meta) + frame('done', { outputTokens: 0, decodeMs: null })));
    await run([], { ...experimentOptions, providerUserId: 'must-not-leave-browser' } as ChatRequestOptions);
    expect(JSON.parse(request.calls.mostRecent().args[1].body)).toEqual({
      model: 'gobwen-flash', messages: [{ role: 'user', content: 'Hello' }], stream: true,
      ...experimentOptions,
    });
    await run([], { ...experimentOptions, useMemory: false, useSandbox: false });
    const body = JSON.parse(request.calls.mostRecent().args[1].body);
    expect(body.useMemory).toBeUndefined();
    expect(body.useSandbox).toBeUndefined();
  });
  it('rejects non-boolean experiment choices and enabled tools for the base model before fetching', async () => {
    for (const choices of [{ useMemory: 'true' }, { useSandbox: 1 }, { useMemory: null }]) {
      await expectAsync(run([], { ...experimentOptions, ...choices } as unknown as ChatRequestOptions))
        .toBeRejectedWithError(/must be true or false/);
    }
    await expectAsync(TestBed.inject(ChatService).stream('goblin', [{ role: 'user', content: 'Continue' }],
      new AbortController().signal, () => {}, experimentOptions)).toBeRejectedWithError(/assistant modes/);
    expect(request).not.toHaveBeenCalled();
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
  it('reports genuine ordered tool activity after protection without counting it as model output', async () => {
    const events: ChatEvent[] = [];
    request.and.resolveTo(response(frame('meta', meta) +
      frame('tool', { name: 'source_lookup', status: 'running' }) +
      frame('tool', { name: 'source_lookup', status: 'complete', route: 'trusted_index' }) +
      frame('done', { outputTokens: 0, decodeMs: null })));
    await run(events);
    expect(events[1]).toEqual({ type: 'tool', tool: { name: 'source_lookup', status: 'running' } });
    expect(events[2]).toEqual({ type: 'tool', tool: { name: 'source_lookup', status: 'complete', route: 'trusted_index' } });
    const done = events[3];
    if (done.type !== 'done') fail('Expected completion');
    else {
      expect(done.metrics.ttftMs).toBeNull();
      expect(done.metrics.firstAnswerMs).toBeNull();
      expect(done.metrics.tokensPerSecond).toBeNull();
    }
  });
  it('does not display tool activity before the protection receipt', async () => {
    const events: ChatEvent[] = [];
    request.and.resolveTo(response(frame('tool', { name: 'calculator', status: 'running' }) + frame('meta', meta)));
    await expectAsync(run(events)).toBeRejectedWithError(/tool activity receipt/);
    expect(events).toEqual([]);
  });
  it('accepts each tool and terminal status from the bounded contract', async () => {
    for (const tool of [
      { name: 'calculator', status: 'complete' },
      { name: 'calculator', status: 'failed' },
      { name: 'site_profile', status: 'complete' },
      { name: 'source_lookup', status: 'unavailable' },
      { name: 'source_lookup', status: 'failed' },
      { name: 'source_lookup', status: 'complete', route: 'web' },
    ] as const) {
      request.and.resolveTo(response(frame('meta', meta) +
        frame('tool', { name: tool.name, status: 'running' }) + frame('tool', tool) +
        frame('done', { outputTokens: 0, decodeMs: null })));
      const events: ChatEvent[] = [];
      await run(events);
      expect(events[2]).toEqual({ type: 'tool', tool });
    }
  });
  it('accepts provider activity only with matching per-request consent and preserves unavailable outcomes', async () => {
    for (const name of ['memory_lookup', 'memory_write', 'python']) {
      for (const status of ['complete', 'failed', 'unavailable']) {
        request.and.resolveTo(response(frame('meta', meta) + frame('tool', { name, status: 'running' }) +
          frame('tool', { name, status }) + frame('done', { outputTokens: 0, decodeMs: null })));
        const events: ChatEvent[] = [];
        await run(events, experimentOptions);
        expect(events[2]).toEqual({ type: 'tool', tool: { name, status } } as ChatEvent);
      }
      for (const choices of [undefined, { ...experimentOptions, useMemory: false, useSandbox: false }]) {
        request.and.resolveTo(response(frame('meta', meta) + frame('tool', { name, status: 'running' })));
        const events: ChatEvent[] = [];
        await expectAsync(run(events, choices)).toBeRejectedWithError(/tool activity receipt/);
        expect(events.some(event => event.type === 'tool')).toBeFalse();
      }
    }
  });
  it('rejects provider tool receipts containing private data or unsupported routes', async () => {
    for (const tool of [
      { name: 'memory_lookup', status: 'running', userId: 'private' },
      { name: 'memory_write', status: 'running', text: 'private fact' },
      { name: 'python', status: 'running', code: 'private code' },
      { name: 'python', status: 'complete', route: 'web' },
    ]) {
      request.and.resolveTo(response(frame('meta', meta) + frame('tool', tool)));
      await expectAsync(run([], experimentOptions)).toBeRejectedWithError(/tool activity receipt/);
    }
  });
  it('rejects invented tool labels, extra data and unsupported route claims', async () => {
    for (const tool of [
      { name: 'browser', status: 'running' },
      { name: ['calculator'], status: 'running' },
      { name: 'calculator', status: 'thinking' },
      { name: 'calculator', status: ['running'] },
      { name: 'calculator', status: 'running', input: 'private expression' },
      { name: 'source_lookup', status: 'running', route: 'web' },
      { name: 'calculator', status: 'complete', route: 'web' },
      { name: 'source_lookup', status: 'complete', route: 'google' },
      { name: 'source_lookup', status: 'complete', route: ['web'] },
    ]) {
      request.and.resolveTo(response(frame('meta', meta) + frame('tool', tool)));
      const events: ChatEvent[] = [];
      await expectAsync(run(events)).toBeRejectedWithError(/tool activity receipt/);
      expect(events.some(event => event.type === 'tool')).toBeFalse();
    }
  });
  it('rejects terminal tool events without a start and duplicate starts or completions', async () => {
    const running = { name: 'calculator', status: 'running' };
    const complete = { name: 'calculator', status: 'complete' };
    for (const tools of [[complete], [running, running], [running, complete, complete], [running, complete, running]]) {
      request.and.resolveTo(response(frame('meta', meta) + tools.map(tool => frame('tool', tool)).join('')));
      const events: ChatEvent[] = [];
      await expectAsync(run(events)).toBeRejectedWithError(/tool activity sequence/);
      expect(events.filter(event => event.type === 'tool').length).toBe(tools.length - 1);
    }
  });
  it('rejects completion while a confirmed tool is still running', async () => {
    request.and.resolveTo(response(frame('meta', meta) +
      frame('tool', { name: 'source_lookup', status: 'running' }) +
      frame('done', { outputTokens: 0, decodeMs: null })));
    const events: ChatEvent[] = [];
    await expectAsync(run(events)).toBeRejected();
    expect(events.some(event => event.type === 'done')).toBeFalse();
  });
  it('preserves indexed provenance and rejects invalid snapshot metadata', async () => {
    const done = frame('done', { outputTokens: 0, decodeMs: null });
    const source = { id: 1, title: 'Docs', url: 'https://docs.example/', kind: 'indexed' as const, indexedAt: '2026-09-28T12:00:00Z' };
    request.and.resolveTo(response(frame('meta', meta) + frame('sources', { sources: [source] }) + done));
    const events: ChatEvent[] = [];
    await run(events);
    expect(events[1]).toEqual({ type: 'sources', sources: [source] });
    for (const change of [{ indexedAt: 'not-a-date' }, { kind: 'invented' }]) {
      request.and.resolveTo(response(frame('meta', meta) + frame('sources', { sources: [{ ...source, ...change }] }) + done));
      await expectAsync(run([])).toBeRejected();
    }
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
  it('accepts a zero-token memory-list completion only for the explicit management command', async () => {
    for (const useMemory of [false, true]) {
      request.and.resolveTo(response(frame('meta', meta) + frame('done', {
        inputTokens: 0, outputTokens: 0, modelCalled: false, modelDurationMs: 0,
        modelBypass: 'memory_lookup', decodeMs: null,
      })));
      const events: ChatEvent[] = [];
      await TestBed.inject(ChatService).stream('gobwen-flash', [{ role: 'user', content: ' Show saved memories. ' }],
        new AbortController().signal, event => events.push(event), { ...experimentOptions, useMemory });
      const done = events[events.length - 1];
      if (done.type !== 'done') fail('Expected memory-list completion');
      else expect(done.metrics.modelBypass).toBe('memory_lookup');
    }
    request.and.resolveTo(response(frame('meta', meta) + frame('done', {
      inputTokens: 0, outputTokens: 0, modelCalled: false, modelDurationMs: 0,
      modelBypass: 'memory_lookup', decodeMs: null,
    })));
    await expectAsync(run([], experimentOptions)).toBeRejectedWithError(/usage receipt/);
  });
  it('explains explicitly suppressed memory-management recording without claiming a save failure', async () => {
    request.and.resolveTo(response(frame('meta', meta) + frame('done', {
      outputTokens: 0, decodeMs: null,
      recording: { archive: 'off', langwatch: 'sent', captureSuppressed: 'memory_management' },
    })));
    const events: ChatEvent[] = [];
    await run(events, { ...experimentOptions, captureConversation: true });
    const done = events[events.length - 1];
    if (done.type !== 'done') fail('Expected completion');
    else expect(done.recordingNotice).toBe('Memory management content excluded from research recording');
  });
  it('does not invoke the gateway without a signed-in token', async () => {
    TestBed.overrideProvider(CHAT_ACCESS_TOKEN, { useValue: async () => '' });
    await expectAsync(run([])).toBeRejectedWithError(/Sign in/);
    expect(request).not.toHaveBeenCalled();
  });
  it('maps failed token retrieval without leaking SDK errors or sending a request', async () => {
    TestBed.overrideProvider(CHAT_ACCESS_TOKEN, { useValue: async () => { throw new Error('private OIDC detail'); } });
    await expectAsync(run([])).toBeRejectedWithError('Your sign-in could not be verified. Your message hasn’t been sent. Please sign in again.');
    expect(request).not.toHaveBeenCalled();
  });
  it('maps fetch failures without claiming the request was unsent or replaying it', async () => {
    request.and.rejectWith(new TypeError('network error with private transport detail'));
    const events: ChatEvent[] = [];
    await expectAsync(run(events)).toBeRejectedWithError('The connection failed before a response could be confirmed. You can edit and try the request again.');
    expect(request).toHaveBeenCalledTimes(1);
    expect(events).toEqual([]);
  });
  it('warns that opted-in writes or Python may have run even when the response never arrives', async () => {
    for (const [prompt, warning] of [
      ['Remember: My favorite color is teal.', 'A memory change may already have completed. Check Show saved memories before repeating it.'],
      ['Forget memory: note-1', 'A memory change may already have completed. Check Show saved memories before repeating it.'],
      ['Run Python: print(1)', 'Python may already have run. Running it again starts a new execution.'],
    ]) {
      request.calls.reset();
      request.and.rejectWith(new TypeError('network error'));
      await expectAsync(TestBed.inject(ChatService).stream('gobwen-flash', [{ role: 'user', content: prompt }],
        new AbortController().signal, () => {}, experimentOptions)).toBeRejectedWithError(new RegExp(warning.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      expect(request).toHaveBeenCalledTimes(1);
    }
  });
  it('keeps partial output incomplete and safely explains an errored reader after tool events', async () => {
    const stream = controlledResponse(frame('meta', meta) +
      frame('tool', { name: 'source_lookup', status: 'running' }) +
      frame('tool', { name: 'source_lookup', status: 'complete', route: 'web' }) +
      frame('delta', { channel: 'answer', text: 'A partial answer' }),
      async () => { throw new DOMException('private network error', 'NetworkError'); });
    request.and.resolveTo(stream.response);
    const events: ChatEvent[] = [];
    await expectAsync(run(events)).toBeRejectedWithError('The connection was interrupted before the answer was complete. The partial reply won’t be used in your next message. You can edit and try the request again.');
    expect(events.some(event => event.type === 'delta')).toBeTrue();
    expect(events.some(event => event.type === 'done')).toBeFalse();
    expect(stream.reader.cancel).toHaveBeenCalledTimes(1);
    expect(stream.reader.releaseLock).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('preserves confirmed operations and warns about unconfirmed ones without replaying a broken stream', async () => {
    for (const name of ['memory_write', 'python']) {
      for (const status of ['running', 'complete']) {
        request.calls.reset();
        const stream = controlledResponse(frame('meta', meta) + frame('tool', { name, status: 'running' }) +
          (status === 'complete' ? frame('tool', { name, status }) : ''),
          async () => { throw new TypeError('network error'); });
        request.and.resolveTo(stream.response);
        const events: ChatEvent[] = [];
        const warning = name === 'memory_write'
          ? status === 'complete' ? /The memory operation completed/ : /A memory change may already have completed/
          : status === 'complete' ? /Python completed/ : /Python may already have run/;
        await expectAsync(run(events, experimentOptions)).toBeRejectedWithError(warning);
        expect(events.some(event => event.type === 'done')).toBeFalse();
        expect(stream.reader.cancel).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledTimes(1);
      }
    }
  });
  it('cancels stalled token retrieval immediately and ignores its late result', async () => {
    let finish!: (token: string) => void;
    TestBed.overrideProvider(CHAT_ACCESS_TOKEN, { useValue: () => new Promise<string>(resolve => finish = resolve) });
    const controller = new AbortController();
    const pending = TestBed.inject(ChatService).stream('gobwen-flash', [{ role: 'user', content: 'Hello' }], controller.signal, () => {});
    controller.abort();
    await expectAsync(pending).toBeRejectedWithError(DOMException, 'Request stopped.');
    finish('late-token');
    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
  });
  it('bounds a stalled token SDK to the deadline without sending a late request', fakeAsync(() => {
    TestBed.overrideProvider(CHAT_ACCESS_TOKEN, { useValue: () => new Promise<string>(() => {}) });
    let failure: Error | undefined;
    run([]).catch(error => failure = error);
    flushMicrotasks();
    tick(149_999);
    expect(failure).toBeUndefined();
    tick(1);
    flushMicrotasks();
    expect(failure?.message).toBe('Sign-in took too long. Your message hasn’t been sent. Please sign in again.');
    expect(request).not.toHaveBeenCalled();
  }));
  it('bounds a stalled stream and leaves a running memory operation uncertain', fakeAsync(() => {
    const stream = controlledResponse(frame('meta', meta) + frame('tool', { name: 'memory_write', status: 'running' }),
      () => new Promise(() => {}));
    request.and.resolveTo(stream.response);
    let failure: Error | undefined;
    const events: ChatEvent[] = [];
    run(events, experimentOptions).catch(error => failure = error);
    flushMicrotasks();
    tick(150_000);
    flushMicrotasks();
    expect(failure?.message).toContain('The request timed out before the answer was complete.');
    expect(failure?.message).toContain('A memory change may already have completed');
    expect(events.some(event => event.type === 'done')).toBeFalse();
    expect(stream.reader.cancel).toHaveBeenCalledTimes(1);
    expect(stream.reader.releaseLock).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  }));
  it('preserves caller cancellation during a stalled read without calling it a network failure', async () => {
    const controller = new AbortController();
    const stream = controlledResponse(frame('meta', meta), () => new Promise(() => {}));
    request.and.resolveTo(stream.response);
    const pending = TestBed.inject(ChatService).stream('gobwen-flash', [{ role: 'user', content: 'Hello' }], controller.signal,
      event => { if (event.type === 'ready') controller.abort(); });
    await expectAsync(pending).toBeRejectedWithError(DOMException, 'Request stopped.');
    expect(stream.reader.cancel).toHaveBeenCalledTimes(1);
    expect(stream.reader.releaseLock).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not let stalled cleanup hang a verified completion', fakeAsync(() => {
    const stream = controlledResponse(frame('meta', meta) + frame('done', { outputTokens: 0, decodeMs: null }),
      () => new Promise(() => {}), () => new Promise(() => {}));
    request.and.resolveTo(stream.response);
    const events: ChatEvent[] = [];
    let finished = false;
    run(events).then(() => finished = true);
    flushMicrotasks();
    expect(events.some(event => event.type === 'done')).toBeTrue();
    expect(finished).toBeFalse();
    tick(1000);
    flushMicrotasks();
    expect(finished).toBeTrue();
    expect(stream.reader.releaseLock).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  }));
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
      { startState: ['warm'] },
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
  it('explains when flagged assistant history was removed without blocking the new question', async () => {
    request.and.resolveTo(response(
      frame('meta', { ...meta, hardening: { ...meta.hardening, changed: true, history_pairs_dropped: 1 } }) +
      frame('delta', { channel: 'answer', text: 'A new answer' }) +
      frame('done', { outputTokens: 0, decodeMs: null }),
    ));
    const events: ChatEvent[] = [];
    await run(events);
    const ready = events[0];
    if (ready.type === 'ready') expect(ready.contextNotice).toContain('previous reply');
    else fail('missing protection receipt');
    expect(events.some(event => event.type === 'blocked')).toBeFalse();
  });
  it('rejects invalid history-removal counts', async () => {
    for (const count of [-1, 11, '1', 0.5]) {
      request.and.resolveTo(response(frame('meta', { ...meta,
        hardening: { ...meta.hardening, history_pairs_dropped: count },
      })));
      await expectAsync(run([])).toBeRejectedWithError(/context protection receipt/);
    }
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
  it('uses final worker state to avoid classifying a tool bypass as cold inference', async () => {
    request.and.resolveTo(response(frame('meta', { ...meta, startState: 'cold' }) +
      frame('tool', { name: 'calculator', status: 'running' }) +
      frame('tool', { name: 'calculator', status: 'complete' }) +
      frame('delta', { text: '4', channel: 'answer' }) +
      frame('done', { outputTokens: 0, inputTokens: 0, decodeMs: null,
        modelCalled: false, modelDurationMs: 0, modelBypass: 'calculator', startState: 'unknown' })));
    const events: ChatEvent[] = [];
    await run(events);
    const done = events[events.length - 1];
    if (done.type === 'done') expect(done.metrics.startState).toBe('unknown');
    else fail('missing completion');
  });
  it('rejects unsupported final worker states before completing a turn', async () => {
    for (const startState of ['warming', ['warm'], null, 1]) {
      request.and.resolveTo(response(frame('meta', meta) + frame('done', {
        outputTokens: 0, decodeMs: null, startState,
      })));
      const events: ChatEvent[] = [];
      await expectAsync(run(events)).toBeRejectedWithError(/worker state receipt/);
      expect(events.some(event => event.type === 'done')).toBeFalse();
    }
  });
  it('rejects truncated streams instead of marking a partial answer complete', async () => {
    request.and.resolveTo(
      response(frame('meta', meta) + frame('delta', { text: 'partial', channel: 'answer' })),
    );
    await expectAsync(run([])).toBeRejectedWithError(/before the answer was complete/);
  });
  it('accepts explicit zero-token bypass receipts and actual model usage', async () => {
    for (const usage of [
      {inputTokens: 0, outputTokens: 0, modelCalled: false, modelDurationMs: 0, modelBypass: 'calculator'},
      {inputTokens: 0, outputTokens: 0, modelCalled: false, modelDurationMs: 0, modelBypass: 'memory_write'},
      {inputTokens: 0, outputTokens: 0, modelCalled: false, modelDurationMs: 0, modelBypass: 'python'},
      {inputTokens: 100, outputTokens: 20, modelCalled: true, modelDurationMs: 1500},
    ]) {
      request.and.resolveTo(response(frame('meta', meta) + frame('done', {...usage, decodeMs: null})));
      const events: ChatEvent[] = [];
      await run(events);
      const done = events[1];
      if (done.type === 'done') expect(done.metrics).toEqual(jasmine.objectContaining(usage));
      else fail('missing usage receipt');
    }
  });
  it('rejects contradictory or invalid savings receipts', async () => {
    for (const patch of [{outputTokens: 1}, {inputTokens: null}, {modelDurationMs: 1},
      {modelCalled: true}, {modelBypass: 'invented'}, {modelBypass: 'memory_lookup'}, {modelBypass: ['python']},
      {inputTokens: -1}, {modelDurationMs: -1}]) {
      request.and.resolveTo(response(frame('meta', meta) + frame('done', {
        inputTokens: 0, outputTokens: 0, modelCalled: false, modelDurationMs: 0,
        modelBypass: 'calculator', decodeMs: null, ...patch,
      })));
      await expectAsync(run([])).toBeRejectedWithError(/usage receipt/);
    }
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
