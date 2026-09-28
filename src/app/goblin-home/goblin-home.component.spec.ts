import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ChatService, ChatEvent } from '../chat/chat.service';
import { GoblinHomeComponent } from './goblin-home.component';
import { AuthService } from '../auth/auth.service';
import { of } from 'rxjs';

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
  it('selects Goblin, prepares prompts and preserves a draft when the endpoint is absent', async () => {
    const page = fixture.componentInstance;
    page.selectModel('goblin');
    page.fillPrompt('A strange little story');
    await page.send();
    fixture.detectChanges();
    expect(page.model.experimental).toBeTrue();
    expect(page.draft).toBe('A strange little story');
    expect(page.error()).toContain('hasn’t been sent');
    expect(service.stream).not.toHaveBeenCalled();
    expect(page.turns()).toEqual([]);
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
});
