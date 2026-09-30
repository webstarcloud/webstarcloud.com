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
  let account: BehaviorSubject<Pick<AuthState, 'isAuthenticated' | 'loading' | 'email'>>;
  let signOut: jasmine.Spy;
  beforeEach(async () => {
    service = { configured: false, stream: jasmine.createSpy('stream') };
    account = new BehaviorSubject<Pick<AuthState, 'isAuthenticated' | 'loading' | 'email'>>({
      isAuthenticated: true, loading: false, email: 'first@example.com',
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
  it('keeps tools off by default, hides them for Goblin and disables consent while signed out or busy', async () => {
    let page = fixture.componentInstance;
    let el = fixture.nativeElement as HTMLElement;
    const tools = () => el.querySelectorAll<HTMLInputElement>('.experiment-tools input');
    expect(page.useMemory).toBeFalse();
    expect(page.useSandbox).toBeFalse();
    expect(tools().length).toBe(2);
    expect(Array.from(tools()).every(input => !input.checked && input.disabled)).toBeTrue();
    service.configured = true;
    // Endpoint configuration is fixed for a component's lifetime in production.
    fixture.destroy();
    fixture = TestBed.createComponent(GoblinHomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    page = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    expect(Array.from(tools()).every(input => !input.disabled)).toBeTrue();
    page.busy.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(tools()).every(input => input.disabled)).toBeTrue();
    page.busy.set(false);
    account.next({ isAuthenticated: false, loading: false, email: null });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(tools()).every(input => input.disabled)).toBeTrue();
    account.next({ isAuthenticated: true, loading: false, email: 'first@example.com' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(tools()).every(input => !input.disabled)).toBeTrue();
    page.selectModel('goblin');
    fixture.detectChanges();
    expect(el.querySelector('.experiment-tools')).toBeNull();
  });
  it('sends separate per-request tool consent without persisting it in a chat', async () => {
    service.configured = true;
    service.stream.and.resolveTo();
    const page = fixture.componentInstance;
    page.useMemory = true;
    page.useSandbox = true;
    page.draft = 'Remember: I prefer short answers.';
    await page.send();
    expect(service.stream.calls.mostRecent().args[4]).toEqual({
      conversationId: page.store.current()!.conversationId, captureConversation: false,
      useMemory: true, useSandbox: true,
    });
    expect(page.store.current()).not.toEqual(jasmine.objectContaining({ useMemory: true }));
    expect(page.store.current()).not.toEqual(jasmine.objectContaining({ useSandbox: true }));
    const session = page.store.current()!;
    page.newChat();
    expect(page.useMemory).toBeFalse();
    expect(page.useSandbox).toBeFalse();
    page.useMemory = true;
    page.useSandbox = true;
    page.openSession(session);
    expect(page.useMemory).toBeFalse();
    expect(page.useSandbox).toBeFalse();
  });
  it('resets tools for account changes, sign out and the base model', () => {
    const page = fixture.componentInstance;
    const enable = () => { page.useMemory = true; page.useSandbox = true; };
    const off = () => { expect(page.useMemory).toBeFalse(); expect(page.useSandbox).toBeFalse(); };
    enable();
    account.next({ isAuthenticated: true, loading: false, email: 'second@example.com' });
    off();
    enable();
    account.next({ isAuthenticated: false, loading: false, email: null });
    off();
    enable();
    page.signOut();
    off();
    expect(signOut).toHaveBeenCalled();
    enable();
    page.selectModel('goblin');
    off();
  });
  it('stops a pending opted-in request when the signed-in account changes', async () => {
    service.configured = true;
    let finish!: () => void;
    service.stream.and.callFake(() => new Promise<void>(resolve => finish = resolve));
    const page = fixture.componentInstance;
    page.useMemory = true;
    page.draft = 'Use my preferences';
    const sending = page.send();
    const signal = service.stream.calls.mostRecent().args[2] as AbortSignal;
    account.next({ isAuthenticated: true, loading: false, email: 'second@example.com' });
    expect(signal.aborted).toBeTrue();
    expect(page.useMemory).toBeFalse();
    finish();
    await sending;
    expect(page.turns()[0].status).toBe('stopped');
  });
  it('shows provider availability from receipts without claiming success for a failed attempt', async () => {
    service.configured = true;
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
