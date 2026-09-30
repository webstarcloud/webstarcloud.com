import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ChatService, ChatEvent } from '../chat/chat.service';
import { GoblinHomeComponent } from './goblin-home.component';
import { AuthService, AuthState } from '../auth/auth.service';
import { BehaviorSubject } from 'rxjs';
import { CHAT_MODELS, ChatTurn } from '../chat/chat.models';

describe('Chat homepage', () => {
  let fixture: ComponentFixture<GoblinHomeComponent>;
  let service: { configured: boolean; stream: jasmine.Spy };
  let account: BehaviorSubject<Pick<AuthState, 'isAuthenticated' | 'loading' | 'email' | 'subject'>>;
  let signOut: jasmine.Spy;
  beforeEach(async () => {
    service = { configured: false, stream: jasmine.createSpy('stream') };
    account = new BehaviorSubject<Pick<AuthState, 'isAuthenticated' | 'loading' | 'email' | 'subject'>>({
      isAuthenticated: true, loading: false, email: 'first@example.com', subject: 'account-one',
    });
    signOut = jasmine.createSpy('signOut');
    await TestBed.configureTestingModule({
      imports: [GoblinHomeComponent, RouterTestingModule],
      providers: [
        { provide: ChatService, useValue: service },
        { provide: AuthService, useValue: {
          get snapshot() { return account.value; },
          state$: account.asObservable(), signIn: jasmine.createSpy('signIn'), signOut,
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GoblinHomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());
  const completeAnswers = () => service.stream.and.callFake(
    async (_model, _messages, _signal, onEvent: (event: ChatEvent) => void) => {
      onEvent({ type: 'delta', channel: 'answer', text: 'An answer' });
      onEvent({ type: 'done', metrics: {
        startState: 'warm', ttftMs: 10, totalMs: 20, outputTokens: 3, tokensPerSecond: 20,
      } });
    },
  );
  it('uses the original logo and keeps the chamber off the main page', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')?.getAttribute('src')).toBe('/assets/favicon.ico');
    expect(el.querySelector('app-goblin-chamber')).toBeNull();
    expect(el.textContent).not.toContain('GOBLIN LAB');
  });
  it('defaults to Think for the initial page and each new chat', () => {
    const page = fixture.componentInstance;
    expect(page.selectedId()).toBe('gobwen-think');
    expect(page.model.mode).toBe('Think');
    page.selectModel('gobwen-flash');
    expect(page.model.mode).toBe('Flash');
    page.newChat();
    expect(page.selectedId()).toBe('gobwen-think');
    expect(page.model.mode).toBe('Think');
  });
  it('offers the Goblin nanoGPT experiment alongside the assistant modes', () => {
    const page = fixture.componentInstance;
    page.modelMenu.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('nanoGPT experiment');
    page.selectModel('goblin');
    expect(page.model.name).toBe('Goblin');
    expect(page.model.experimental).toBeTrue();
    expect(page.model.mode).toBe('Base');
  });
  it('unlocks checked tools after acknowledgement, and explains disconnected or unsigned states', async () => {
    let page = fixture.componentInstance;
    let el = fixture.nativeElement as HTMLElement;
    const tools = () => el.querySelectorAll<HTMLInputElement>('.experiment-tools input');
    expect(page.useMemory).toBeFalse();
    expect(page.useSandbox).toBeFalse();
    expect(tools().length).toBe(2);
    expect(Array.from(tools()).every(input => !input.checked && input.disabled)).toBeTrue();
    expect(el.textContent).toContain('This preview isn’t connected to a model');
    service.configured = true;
    // Endpoint configuration is fixed for a component's lifetime in production.
    fixture.destroy();
    fixture = TestBed.createComponent(GoblinHomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    page = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.experiment-consent')).not.toBeNull();
    expect(Array.from(tools()).every(input => input.disabled)).toBeTrue();
    const agree = el.querySelector<HTMLButtonElement>('.experiment-consent-actions button')!;
    agree.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.experiment-consent')).toBeNull();
    expect(Array.from(tools()).every(input => input.checked && !input.disabled)).toBeTrue();
    expect(page.captureConversation).toBeTrue();
    // Exercise the actual switch binding after acknowledgement.
    tools()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.useMemory).toBeFalse();
    tools()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.useMemory).toBeTrue();
    expect(Array.from(tools()).every(input => !input.disabled)).toBeTrue();
    page.busy.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(tools()).every(input => input.disabled)).toBeTrue();
    page.busy.set(false);
    account.next({ isAuthenticated: false, loading: false, email: null, subject: null });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(tools()).every(input => input.disabled)).toBeTrue();
    account.next({ isAuthenticated: true, loading: false, email: 'first@example.com', subject: 'account-one' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(tools()).every(input => input.disabled && !input.checked)).toBeTrue();
    expect(el.querySelector('.experiment-consent')).not.toBeNull();
    page.acknowledgeExperiments(true);
    page.selectModel('goblin');
    fixture.detectChanges();
    expect(el.querySelector('.experiment-tools')).toBeNull();
  });
  it('sends all acknowledged defaults and keeps choices across new and reopened chats', async () => {
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(true);
    service.stream.and.resolveTo();
    const page = fixture.componentInstance;
    page.useMemory = true;
    page.useSandbox = true;
    page.draft = 'Remember: I prefer short answers.';
    await page.send();
    expect(service.stream.calls.mostRecent().args[4]).toEqual({
      conversationId: page.store.current()!.conversationId, captureConversation: true,
      useMemory: true, useSandbox: true,
    });
    expect(page.store.current()).not.toEqual(jasmine.objectContaining({ useMemory: true }));
    expect(page.store.current()).not.toEqual(jasmine.objectContaining({ useSandbox: true }));
    const session = page.store.current()!;
    page.newChat();
    expect(page.useMemory).toBeTrue();
    expect(page.useSandbox).toBeTrue();
    expect(page.captureConversation).toBeTrue();
    page.captureConversation = false;
    page.openSession(session);
    expect(page.useMemory).toBeTrue();
    expect(page.useSandbox).toBeTrue();
    // Reopening an old recorded chat cannot silently re-enable recording.
    expect(session.captureConversation).toBeTrue();
    expect(page.captureConversation).toBeFalse();
  });
  it('resets every optional feature for account changes and sign out', () => {
    service.configured = true;
    const page = fixture.componentInstance;
    const enable = () => page.acknowledgeExperiments(true);
    const off = () => {
      expect(page.useMemory).toBeFalse(); expect(page.useSandbox).toBeFalse();
      expect(page.captureConversation).toBeFalse();
    };
    enable();
    account.next({ isAuthenticated: true, loading: false, email: 'second@example.com', subject: 'account-two' });
    off();
    enable();
    account.next({ isAuthenticated: false, loading: false, email: null, subject: null });
    off();
    account.next({ isAuthenticated: true, loading: false, email: 'first@example.com', subject: 'account-one' });
    enable();
    page.signOut();
    off();
    expect(signOut).toHaveBeenCalled();
  });
  it('starts a fresh recorded chat without replaying opted-out history or losing its draft', async () => {
    service.configured = true;
    const page = fixture.componentInstance;
    page.acknowledgeExperiments(false);
    page.useMemory = true;
    page.selectModel('gobwen-flash');
    completeAnswers();
    page.draft = 'Private earlier question';
    await page.send();
    const previous = page.store.current()!;
    expect(previous.turns[0].captureRequested).toBeFalse();
    page.draft = 'New question I want recorded';
    fixture.detectChanges();
    await fixture.whenStable();
    const recording = fixture.nativeElement.querySelector('.research-recording input') as HTMLInputElement;
    expect(recording.checked).toBeFalse();
    expect(recording.disabled).toBeFalse();
    recording.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.turns()).toEqual([]);
    expect(page.store.sessions()[0].turns).toEqual(previous.turns);
    expect(page.draft).toBe('New question I want recorded');
    expect(page.selectedId()).toBe('gobwen-flash');
    expect(page.useMemory).toBeTrue();
    expect(page.useSandbox).toBeFalse();
    expect(fixture.nativeElement.querySelector('.recording-boundary')?.textContent).toContain('previous chat');
    await page.send();
    const request = service.stream.calls.mostRecent().args;
    expect(request[1]).toEqual([{ role: 'user', content: 'New question I want recorded' }]);
    expect(request[4].captureConversation).toBeTrue();
    expect(request[4].conversationId).not.toBe(previous.conversationId);
    expect(page.store.current()!.turns[0].captureRequested).toBeTrue();
    expect(page.store.sessions().length).toBe(2);
    expect(page.store.sessions().find(session => session.id === previous.id)!.turns[0].prompt).toBe('Private earlier question');
  });
  it('excludes messages sent during an off interval when recording is enabled again', async () => {
    service.configured = true;
    const page = fixture.componentInstance;
    page.acknowledgeExperiments(true);
    completeAnswers();
    page.draft = 'Initially recorded';
    await page.send();
    page.captureConversation = false;
    page.draft = 'Private off interval';
    await page.send();
    const previous = page.store.current()!;
    expect(previous.turns.map(turn => turn.captureRequested)).toEqual([true, false]);
    expect(service.stream.calls.mostRecent().args[4].captureConversation).toBeFalse();
    page.captureConversation = true;
    page.draft = 'Record from here';
    await page.send();
    expect(service.stream.calls.mostRecent().args[1]).toEqual([{ role: 'user', content: 'Record from here' }]);
    expect(page.store.current()!.conversationId).not.toBe(previous.conversationId);
    expect(page.store.sessions().find(session => session.id === previous.id)!.turns.length).toBe(2);
  });
  it('lets an opted-out chat be read but starts fresh before a recorded follow-up', async () => {
    service.configured = true;
    const page = fixture.componentInstance;
    page.acknowledgeExperiments(false);
    completeAnswers();
    page.draft = 'Older private question';
    await page.send();
    const privateChat = page.store.current()!;
    page.newChat();
    page.captureConversation = true;
    page.draft = 'Separate recorded question';
    await page.send();
    page.openSession(privateChat);
    fixture.detectChanges();
    expect(page.turns()[0].prompt).toBe('Older private question');
    expect(page.captureConversation).toBeTrue();
    expect(fixture.nativeElement.querySelector('.recording-boundary')?.textContent).toContain('next message');
    page.draft = 'Follow-up with recording on';
    await page.send();
    expect(service.stream.calls.mostRecent().args[1]).toEqual([{ role: 'user', content: 'Follow-up with recording on' }]);
    expect(service.stream.calls.mostRecent().args[4].conversationId).not.toBe(privateChat.conversationId);
    expect(page.store.sessions().find(session => session.id === privateChat.id)!.turns[0].prompt).toBe('Older private question');
  });
  it('continues an all-consented reopened chat with its original context and ID', async () => {
    service.configured = true;
    const page = fixture.componentInstance;
    page.acknowledgeExperiments(true);
    completeAnswers();
    page.draft = 'Recorded earlier question';
    await page.send();
    const recordedChat = page.store.current()!;
    page.newChat();
    page.openSession(recordedChat);
    page.draft = 'Recorded follow-up';
    await page.send();
    expect(service.stream.calls.mostRecent().args[1]).toEqual([
      { role: 'user', content: 'Recorded earlier question' },
      { role: 'assistant', content: 'An answer' },
      { role: 'user', content: 'Recorded follow-up' },
    ]);
    expect(service.stream.calls.mostRecent().args[4].conversationId).toBe(recordedChat.conversationId);
    expect(page.store.sessions().length).toBe(1);
    expect(page.recordingBoundaryNotice()).toBe('');
  });
  it('checks unknown recording provenance after reopening rather than trusting the last session preference', async () => {
    service.configured = true;
    const page = fixture.componentInstance;
    page.acknowledgeExperiments(true);
    completeAnswers();
    page.draft = 'Legacy question';
    await page.send();
    const recordedChat = page.store.current()!;
    const legacy = { ...recordedChat, turns: recordedChat.turns.map(turn => {
      const withoutProvenance = { ...turn };
      delete withoutProvenance.captureRequested;
      return withoutProvenance;
    }) };
    page.newChat();
    page.store.save(legacy);
    page.openSession(legacy);
    expect(legacy.captureConversation).toBeTrue();
    page.draft = 'New consenting question';
    await page.send();
    expect(service.stream.calls.mostRecent().args[1]).toEqual([{ role: 'user', content: 'New consenting question' }]);
    expect(service.stream.calls.mostRecent().args[4].conversationId).not.toBe(legacy.conversationId);
  });
  it('enforces the recording boundary after navigation and clears it for a different account', async () => {
    service.configured = true;
    let page = fixture.componentInstance;
    page.acknowledgeExperiments(false);
    completeAnswers();
    page.draft = 'Private before navigation';
    await page.send();
    const previous = page.store.current()!;
    // A preference update elsewhere must not bypass the send-time boundary.
    page.experiments.set('recording', true);
    fixture.destroy();
    fixture = TestBed.createComponent(GoblinHomeComponent);
    fixture.detectChanges();
    page = fixture.componentInstance;
    expect(page.recordingBoundaryNotice()).toContain('next message');
    page.draft = 'New recorded question after navigation';
    await page.send();
    expect(service.stream.calls.mostRecent().args[1]).toEqual([{ role: 'user', content: 'New recorded question after navigation' }]);
    expect(page.store.current()!.conversationId).not.toBe(previous.conversationId);
    account.next({ isAuthenticated: true, loading: false, email: 'second@example.com', subject: 'account-two' });
    expect(page.recordingBoundaryNotice()).toBe('');
    expect(page.captureConversation).toBeFalse();
    expect(page.store.sessions()).toEqual([]);
    page.acknowledgeExperiments(true);
    page.draft = 'New account question';
    await page.send();
    expect(service.stream.calls.mostRecent().args[1]).toEqual([{ role: 'user', content: 'New account question' }]);
  });
  it('does not send or lose the draft until a signed-in user chooses how to continue', async () => {
    service.configured = true;
    const page = fixture.componentInstance;
    page.draft = 'Keep this question';
    await page.send();
    expect(service.stream).not.toHaveBeenCalled();
    expect(page.draft).toBe('Keep this question');
    expect(page.error()).toContain('notice');
    page.acknowledgeExperiments(false);
    service.stream.and.resolveTo();
    await page.send();
    expect(service.stream.calls.mostRecent().args[4]).toEqual({
      conversationId: page.store.current()!.conversationId, captureConversation: false,
      useMemory: false, useSandbox: false,
    });
  });
  it('does not send provider flags to the base experiment or discard settings when switching back', async () => {
    service.configured = true;
    const page = fixture.componentInstance;
    page.acknowledgeExperiments(true);
    page.selectModel('goblin');
    page.draft = 'Once upon a time,';
    service.stream.and.resolveTo();
    await page.send();
    expect(service.stream.calls.mostRecent().args[4]).toEqual({
      conversationId: page.store.current()!.conversationId, captureConversation: true,
      useMemory: false, useSandbox: false,
    });
    page.selectModel('gobwen-think');
    expect(page.useMemory).toBeTrue();
    expect(page.useSandbox).toBeTrue();
  });
  it('stops a pending opted-in request when the signed-in account changes', async () => {
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(false);
    let finish!: () => void;
    service.stream.and.callFake(() => new Promise<void>(resolve => finish = resolve));
    const page = fixture.componentInstance;
    page.useMemory = true;
    page.draft = 'Use my preferences';
    const sending = page.send();
    const signal = service.stream.calls.mostRecent().args[2] as AbortSignal;
    account.next({ isAuthenticated: true, loading: false, email: 'second@example.com', subject: 'account-two' });
    expect(signal.aborted).toBeTrue();
    expect(page.useMemory).toBeFalse();
    finish();
    await sending;
    expect(page.turns()).toEqual([]);
    expect(page.store.sessions()).toEqual([]);
  });
  it('shows provider availability from receipts without claiming success for a failed attempt', async () => {
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(false);
    service.stream.and.callFake(async (_model, _messages, _signal, onEvent: (event: ChatEvent) => void) => {
      onEvent({ type: 'ready', servedModel: 'Qwen' });
      onEvent({ type: 'tool', tool: { name: 'memory_write', status: 'running' } });
      onEvent({ type: 'tool', tool: { name: 'memory_write', status: 'unavailable' } });
      onEvent({ type: 'tool', tool: { name: 'python', status: 'running' } });
      onEvent({ type: 'tool', tool: { name: 'python', status: 'complete' } });
      onEvent({ type: 'delta', channel: 'answer', text: 'Memory is unavailable. Python returned 2.' });
      onEvent({ type: 'done', metrics: { startState: 'unknown', ttftMs: 10, totalMs: 20, outputTokens: 0, tokensPerSecond: null } });
    });
    const page = fixture.componentInstance;
    page.useMemory = true;
    page.useSandbox = true;
    page.draft = 'Run Python: print(1 + 1)';
    await page.send();
    fixture.detectChanges();
    const receipt = fixture.nativeElement.querySelector('.tool-activity')?.textContent;
    expect(receipt).toContain('Memory update unavailable');
    expect(receipt).toContain('Python sandbox used');
    expect(receipt).not.toContain('Memory saved');
  });
  it('selects Think and preserves a draft when the endpoint is absent', async () => {
    const page = fixture.componentInstance;
    page.fillPrompt('A strange little story');
    await page.send();
    fixture.detectChanges();
    expect(page.model.mode).toBe('Think');
    expect(page.draft).toBe('A strange little story');
    expect(page.error()).toContain('hasn’t been sent');
    expect(service.stream).not.toHaveBeenCalled();
    expect(page.turns()).toEqual([]);
  });
  it('shows confirmed tool activity while Thinking, then retains it with the completed answer', async () => {
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(false);
    let emit!: (event: ChatEvent) => void;
    let finish!: () => void;
    service.stream.and.callFake((_model, _messages, _signal, onEvent) => {
      emit = onEvent;
      return new Promise<void>(resolve => finish = resolve);
    });
    const page = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    page.draft = 'Who is the king?';
    const sending = page.send();
    fixture.detectChanges();
    expect(el.querySelector('.working')?.textContent).toContain('Thinking');
    expect(el.querySelector('.tool-activity')).toBeNull();
    emit({ type: 'ready', servedModel: 'Qwen' });
    emit({ type: 'tool', tool: { name: 'source_lookup', status: 'running' } });
    fixture.detectChanges();
    expect(el.querySelector('.working')).not.toBeNull();
    expect(el.querySelector('.tool-activity li')?.textContent).toContain('Source lookup running');
    expect(el.querySelectorAll('.tool-running').length).toBe(1);
    emit({ type: 'tool', tool: { name: 'source_lookup', status: 'complete', route: 'trusted_index' } });
    emit({ type: 'sources', sources: [{ id: 1, title: 'Royal House', url: 'https://www.royal-house.nl/' }] });
    emit({ type: 'delta', channel: 'reasoning', text: 'Read the evidence.' });
    fixture.detectChanges();
    expect(el.querySelector('.working')).not.toBeNull();
    expect(el.querySelector('.answer-sources')).toBeNull();
    expect(el.querySelectorAll('.tool-activity li').length).toBe(1);
    expect(el.querySelector('.tool-activity')?.textContent).toContain('Selected sources used');
    expect(el.querySelector('.tool-running')).toBeNull();
    emit({ type: 'delta', channel: 'answer', text: 'Willem' });
    fixture.detectChanges();
    expect(el.querySelector('.working')).toBeNull();
    expect(el.querySelector('.assistant-message.is-streaming')?.textContent).toBe('Willem');
    expect(el.querySelector('.answer-sources')).not.toBeNull();
    emit({ type: 'delta', channel: 'answer', text: '-Alexander. [1]' });
    emit({ type: 'done', metrics: { startState: 'warm', ttftMs: 10, totalMs: 20, outputTokens: 5, tokensPerSecond: 30 } });
    finish();
    await sending;
    fixture.detectChanges();
    expect(el.querySelector('.assistant-message')?.textContent).toBe('Willem-Alexander. [1]');
    expect(el.querySelector('.is-streaming')).toBeNull();
    expect(el.querySelector('.tool-activity')?.textContent).toContain('Selected sources used');
    expect(page.store.sessions()[0].turns[0].tools).toEqual([
      { name: 'source_lookup', status: 'complete', route: 'trusted_index' },
    ]);
    page.newChat();
    fixture.detectChanges();
    expect(el.querySelector('.tool-activity')).toBeNull();
    page.openSession(page.store.sessions()[0]);
    fixture.detectChanges();
    expect(el.querySelector('.tool-activity')?.textContent).toContain('Selected sources used');
    expect(el.querySelector('.working')).toBeNull();
  });
  it('streams real service events into a conversation and keeps completed turns in the next request', async () => {
    // Two fast tool completions can share a wall-clock millisecond.
    spyOn(Date, 'now').and.returnValue(1_700_000_000_000);
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(false);
    service.stream.and.callFake(
      async (
        _model: unknown,
        _messages: unknown,
        _signal: unknown,
        onEvent: (event: ChatEvent) => void,
      ) => {
        onEvent({ type: 'ready', servedModel: 'Qwen/Qwen3.5-0.8B' });
        onEvent({ type: 'delta', text: 'An answer', channel: 'answer' });
        onEvent({
          type: 'done',
          metrics: {
            startState: 'warm',
            ttftMs: 30,
            tokensPerSecond: 20,
            totalMs: 100,
            outputTokens: 3,
          },
        });
      },
    );
    const page = fixture.componentInstance;
    page.draft = 'First question';
    await page.send();
    page.draft = 'Follow up';
    await page.send();
    expect(page.turns()[0].answer).toBe('An answer');
    expect(page.turns()[1].answer).toBe('An answer');
    expect(page.turns()[0].id).not.toBe(page.turns()[1].id);
    expect(page.turns()[0].guard).toBe('checked');
    expect(service.stream.calls.mostRecent().args[1]).toEqual([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'An answer' },
      { role: 'user', content: 'Follow up' },
    ]);
    expect(page.store.sessions().length).toBe(1);
    page.newChat();
    expect(page.turns()).toEqual([]);
    expect(page.store.sessions()[0].turns.length).toBe(2);
  });
  it('reports interrupted tool activity when the request fails instead of implying ongoing work', async () => {
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(false);
    service.stream.and.callFake(async (_model, _messages, _signal, onEvent: (event: ChatEvent) => void) => {
      onEvent({ type: 'ready', servedModel: 'Qwen' });
      onEvent({ type: 'tool', tool: { name: 'source_lookup', status: 'running' } });
      throw new Error('The connection ended before the answer was complete.');
    });
    const page = fixture.componentInstance;
    page.draft = 'Who is the king?';
    await page.send();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(page.turns()[0].status).toBe('error');
    expect(el.querySelector('.working')).toBeNull();
    expect(el.querySelector('.tool-activity')?.textContent).toContain('Source lookup interrupted');
    expect(el.querySelector('.tool-activity')?.textContent).not.toContain('running');
    expect(el.querySelector('.tool-running')).toBeNull();
  });
  it('stops pending work and retains its stopped state when starting another chat', async () => {
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(false);
    let finish!: () => void;
    service.stream.and.callFake(() => new Promise<void>((resolve) => (finish = resolve)));
    const page = fixture.componentInstance;
    page.draft = 'Wait';
    const sending = page.send();
    page.newChat();
    finish();
    await sending;
    expect(page.turns()).toEqual([]);
    expect(page.busy()).toBeFalse();
    expect(page.store.sessions()[0].turns[0].status).toBe('stopped');
  });
  it('preserves the draft and makes no request when signed out', async () => {
    service.configured = true;
    fixture.componentInstance.acknowledgeExperiments(false);
    const page = fixture.componentInstance;
    page.auth.snapshot.isAuthenticated = false;
    page.draft = 'Keep my draft';
    await page.send();
    expect(page.draft).toBe('Keep my draft');
    expect(page.turns()).toEqual([]);
    expect(service.stream).not.toHaveBeenCalled();
    expect(page.error()).toContain('Sign in');
  });
  it('shows actual token usage without the model-call-avoided badge', () => {
    const page = fixture.componentInstance;
    const skipped: ChatTurn = {
      id: 1, prompt: 'What is 2 + 2?', answer: '4', reasoning: '', model: CHAT_MODELS[0],
      status: 'complete', guard: 'checked', servedModel: 'model-v1',
      metrics: { startState: 'unknown', ttftMs: 20, tokensPerSecond: null, totalMs: 40,
        inputTokens: 0, outputTokens: 0, modelCalled: false, modelDurationMs: 0, modelBypass: 'calculator' },
    };
    page.turns.set([skipped]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.saving-badge')).toBeNull();
    expect(el.textContent).not.toContain('Model call avoided');
    expect(el.textContent).toContain('0 tokens');
    page.turns.set([skipped, { ...skipped, id: 2, metrics: {
      ...skipped.metrics!, startState: 'warm', inputTokens: 100, outputTokens: 50,
      modelCalled: true, modelDurationMs: 4000, modelBypass: undefined,
    } }]);
    fixture.detectChanges();
    expect(el.querySelector('.saving-badge')).toBeNull();
    expect(el.textContent).not.toContain('Model call avoided');
    expect(el.textContent).toContain('150 tokens');
  });
});
