import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ChatService, ChatEvent } from '../chat/chat.service';
import { GoblinHomeComponent } from './goblin-home.component';
import { AuthService } from '../auth/auth.service';
import { of } from 'rxjs';
import { CHAT_MODELS, ChatTurn } from '../chat/chat.models';

describe('Chat homepage', () => {
  let fixture: ComponentFixture<GoblinHomeComponent>;
  let service: { configured: boolean; stream: jasmine.Spy };
  beforeEach(async () => {
    service = { configured: false, stream: jasmine.createSpy('stream') };
    await TestBed.configureTestingModule({
      imports: [GoblinHomeComponent, RouterTestingModule],
      providers: [
        { provide: ChatService, useValue: service },
        { provide: AuthService, useValue: {
          snapshot: { isAuthenticated: true, loading: false },
          state$: of({ isAuthenticated: true, loading: false }), signIn: jasmine.createSpy('signIn'),
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GoblinHomeComponent);
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
