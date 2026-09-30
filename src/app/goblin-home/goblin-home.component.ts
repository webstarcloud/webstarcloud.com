import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, ChatModelId, ChatTurn } from '../chat/chat.models';
import { ChatService } from '../chat/chat.service';
import { ChatSession, ChatStore } from '../chat/chat-store.service';
import { ChatToolsComponent } from '../chat-tools/chat-tools.component';
import { AuthService } from '../auth/auth.service';
import { conversationContext, restoreLoginDraft, saveLoginDraft } from '../chat/chat-context';
import { usageLabel } from '../chat/chat-savings';
import { toolActivityLabel } from '../chat/tool-activity';
import { CostComparisonComponent } from '../cost-comparison/cost-comparison.component';
import { Subscription } from 'rxjs';
import { ExperimentPreferencesService } from '../chat/experiment-preferences.service';

@Component({
  selector: 'app-goblin-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChatToolsComponent, CostComparisonComponent],
  templateUrl: './goblin-home.component.html',
  styleUrls: ['./chat-chrome.css', './goblin-home.component.css', './experiment-note.css', './tool-activity.css', './experiment-tools.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoblinHomeComponent implements OnDestroy {
  @ViewChild('composer') composer?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('transcript') transcript?: ElementRef<HTMLElement>;
  @ViewChild('experimentNotice') experimentNotice?: ElementRef<HTMLElement>;
  readonly store = inject(ChatStore);
  readonly chat = inject(ChatService);
  readonly auth = inject(AuthService);
  readonly experiments = inject(ExperimentPreferencesService);
  readonly models = CHAT_MODELS;
  readonly selectedId = signal<ChatModelId>(this.store.current()?.modelId ?? DEFAULT_CHAT_MODEL);
  readonly turns = signal<ChatTurn[]>(this.store.current()?.turns ?? []);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly modelMenu = signal(false);
  readonly sidebarOpen = signal(window.innerWidth > 760);
  readonly tools = signal<'protection' | null>(null);
  readonly copied = signal<number | null>(null);
  readonly usageLabel = usageLabel;
  readonly toolActivityLabel = toolActivityLabel;
  draft = this.store.current()?.draft ?? '';
  private consentAccount: string | null = null;
  private readonly authSubscription: Subscription;
  private nextTurnId = this.store.sessions().reduce(
    (latest, session) => session.turns.reduce((id, turn) => Math.max(id, turn.id), latest),
    Date.now(),
  );
  private controller?: AbortController;
  private copyTimer?: ReturnType<typeof setTimeout>;
  private scrollFrame?: number;
  constructor() {
    this.authSubscription = this.auth.state$.subscribe(account => {
      if (account.loading || (account.isAuthenticated && !account.subject)) return;
      const identity = account.isAuthenticated ? account.subject : null;
      if (this.consentAccount && identity !== this.consentAccount) {
        this.stop();
        this.turns.set([]);
        this.draft = '';
        this.selectedId.set(DEFAULT_CHAT_MODEL);
      }
      this.consentAccount = identity;
    });
    const saved = restoreLoginDraft();
    if (saved) {
      this.draft = saved.draft;
      this.selectedId.set(saved.model);
    }
  }
  signIn() {
    if (!saveLoginDraft(this.draft, this.selectedId()) && this.draft) {
      this.error.set('Your browser can’t save this draft for sign-in. Copy it first, then clear it and sign in.');
      return;
    }
    this.auth.signIn('/');
  }
  signOut() {
    this.experiments.reset();
    this.stop();
    this.auth.signOut();
  }
  get experimentToolsDisabled(): boolean {
    return this.experimentChoicesDisabled || this.model.experimental;
  }
  get experimentChoicesDisabled(): boolean {
    return this.busy() || !this.chat.configured || this.auth.snapshot.loading ||
      !this.auth.snapshot.isAuthenticated || !this.auth.snapshot.subject || !this.experiments.state().acknowledged;
  }
  get showExperimentNotice(): boolean {
    const account = this.auth.snapshot;
    return this.chat.configured && account.isAuthenticated && !account.loading &&
      !!account.subject && !this.experiments.state().acknowledged;
  }
  get useMemory(): boolean { return this.experiments.state().memory; }
  set useMemory(enabled: boolean) { this.experiments.set('memory', enabled); }
  get useSandbox(): boolean { return this.experiments.state().sandbox; }
  set useSandbox(enabled: boolean) { this.experiments.set('sandbox', enabled); }
  get captureConversation(): boolean { return this.experiments.state().recording; }
  set captureConversation(enabled: boolean) { this.experiments.set('recording', enabled); }
  acknowledgeExperiments(enabled: boolean): void {
    if (!this.chat.configured || this.busy()) return;
    this.experiments.acknowledge(enabled);
    this.persist();
    this.error.set('');
    this.composer?.nativeElement.focus();
  }
  get model() {
    return this.models.find((item) => item.id === this.selectedId())!;
  }
  get samples(): string[] {
    return this.model.experimental
      ? ['Once upon a time,', 'The experiment began when', 'In the quiet of the forest,']
      : ['Explain something simply', 'Help me solve a problem', 'Make something with code'];
  }
  @HostListener('document:keydown.escape') escape() {
    this.modelMenu.set(false);
    this.tools.set(null);
    if (window.innerWidth <= 760) this.sidebarOpen.set(false);
  }
  selectModel(id: ChatModelId) {
    if (this.busy() || !this.models.some(model => model.id === id)) return;
    this.selectedId.set(id);
    this.modelMenu.set(false);
    this.persist();
    this.error.set('');
  }
  newChat() {
    this.stop();
    this.store.activeId.set(null);
    this.selectedId.set(DEFAULT_CHAT_MODEL);
    this.turns.set([]);
    this.draft = '';
    this.error.set('');
    this.modelMenu.set(false);
    if (window.innerWidth <= 760) this.sidebarOpen.set(false);
    this.composer?.nativeElement.focus();
  }
  openSession(session: ChatSession) {
    this.stop();
    this.store.activeId.set(session.id);
    this.turns.set(session.turns);
    this.draft = session.draft;
    this.selectedId.set(session.modelId);
    this.error.set('');
    if (window.innerWidth <= 760) this.sidebarOpen.set(false);
  }
  fillPrompt(sample: string) {
    this.draft = sample;
    this.error.set('');
    this.persist();
    this.composer?.nativeElement.focus();
  }
  keydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void this.send();
    }
  }
  resize() {
    const element = this.composer?.nativeElement;
    if (element) {
      element.style.height = 'auto';
      element.style.height = Math.min(180, element.scrollHeight) + 'px';
    }
    this.persist();
  }
  async send() {
    if (this.busy() || !this.draft.trim()) return;
    this.error.set('');
    this.modelMenu.set(false);
    if (!this.chat.configured) {
      this.error.set('The model isn’t connected yet. Your message hasn’t been sent.');
      return;
    }
    if (this.auth.snapshot.loading || !this.auth.snapshot.isAuthenticated) {
      this.error.set(this.auth.snapshot.loading ? 'Checking your sign-in…' : 'Sign in with Google to chat. Your draft is ready when you return.');
      return;
    }
    if (!this.auth.snapshot.subject || !this.experiments.state().acknowledged) {
      this.error.set(this.auth.snapshot.subject
        ? 'Review the experimental-features notice before sending. Your draft is still here.'
        : 'Finishing your sign-in… Your draft is still here.');
      this.experimentNotice?.nativeElement.focus();
      return;
    }
    const prompt = this.draft.trim();
    if ([...prompt].length > 2000) {
      this.error.set('Please keep your message to 2,000 characters for this first version.');
      return;
    }
    const messages = conversationContext(this.turns(), prompt, this.selectedId());
    if (!this.store.current()) this.store.newSession(this.selectedId());
    const turn: ChatTurn = {
      id: ++this.nextTurnId,
      prompt,
      answer: '',
      reasoning: '',
      model: this.model,
      status: 'waiting',
      guard: 'waiting',
    };
    this.turns.update((items) => [...items, turn]);
    this.draft = '';
    this.busy.set(true);
    this.persist();
    this.resize();
    const controller = new AbortController();
    this.controller = controller;
    const update = (patch: Partial<ChatTurn>) => {
      this.turns.update((items) =>
        items.map((item) => (item.id === turn.id ? { ...item, ...patch } : item)),
      );
      this.persist();
    };
    try {
      await this.chat.stream(
        this.selectedId(),
        messages,
        controller.signal,
        (event) => {
          if (controller.signal.aborted) return;
          if (event.type === 'ready') update({ guard: 'checked', servedModel: event.servedModel, contextNotice: event.contextNotice });
          if (event.type === 'sources') update({ sources: event.sources });
          if (event.type === 'tool') {
            const current = this.turns().find(item => item.id === turn.id)!;
            const activities = current.tools ?? [];
            update({ tools: [...activities.filter(tool => tool.name !== event.tool.name), event.tool] });
          }
          if (event.type === 'delta') {
            const current = this.turns().find((item) => item.id === turn.id)!;
            update({
              status: 'streaming',
              ...(event.channel === 'answer'
                ? { answer: current.answer + event.text }
                : { reasoning: current.reasoning + event.text }),
            });
            this.scrollToLatest();
          }
          if (event.type === 'blocked')
            update({
              status: 'blocked',
              guard: 'blocked',
              error:
                'Input protection stopped this message before it reached the model. Edit your message to try again.',
            });
          if (event.type === 'done') update({ status: 'complete', metrics: event.metrics, finishReason: event.finishReason, recordingNotice: event.recordingNotice });
        },
        { conversationId: this.store.current()!.conversationId, captureConversation: this.captureConversation,
          useMemory: !this.model.experimental && this.useMemory,
          useSandbox: !this.model.experimental && this.useSandbox,
        },
      );
    } catch (error) {
      if (controller.signal.aborted) update({ status: 'stopped' });
      else
        update({
          status: 'error',
          error:
            error instanceof Error ? error.message : 'The connection failed. Please try again.',
        });
    } finally {
      // A newer request may have started after Stop. Do not clear its state.
      if (this.controller === controller) {
        this.busy.set(false);
        this.controller = undefined;
      }
      this.persist();
    }
  }
  stop() {
    this.controller?.abort();
    this.turns.update((items) =>
      items.map((turn) =>
        turn.status === 'waiting' || turn.status === 'streaming'
          ? { ...turn, status: 'stopped' }
          : turn,
      ),
    );
    this.busy.set(false);
    this.persist();
  }
  retry(turn: ChatTurn) {
    if (!this.busy()) {
      this.selectedId.set(turn.model.id);
      this.fillPrompt(turn.prompt);
    }
  }
  async copy(turn: ChatTurn) {
    try {
      await navigator.clipboard.writeText(turn.answer);
      this.copied.set(turn.id);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(null), 1800);
    } catch {
      this.error.set('Clipboard access is unavailable. You can select and copy the answer.');
    }
  }
  persist() {
    const session = this.store.current();
    if (session)
      this.store.save({
        ...session,
        modelId: this.selectedId(),
        turns: this.turns(),
        draft: this.draft,
        captureConversation: this.captureConversation,
        title: this.turns()[0]?.prompt.slice(0, 48) || 'New chat',
      });
  }
  private scrollToLatest() {
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = requestAnimationFrame(() => {
      const el = this.transcript?.nativeElement;
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 180)
        el.scrollTop = el.scrollHeight;
    });
  }
  ngOnDestroy() {
    this.stop();
    this.authSubscription.unsubscribe();
    this.persist();
    clearTimeout(this.copyTimer);
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
  }
}
