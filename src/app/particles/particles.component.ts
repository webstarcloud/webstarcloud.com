import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { ASCII_PORTRAIT_FRAMES, ASCII_PORTRAIT_SEQUENCE } from './ascii-portrait';

type AsciiMood = 'architecture' | 'agentic' | 'migration' | 'resilience' | 'tooling';
export type StageMode = 'home' | 'ventures' | 'labs' | 'anchorkeep' | 'greenlight' | 'lab-detail';

const moodKeywords: Readonly<Record<AsciiMood, readonly string[]>> = {
  architecture: ['architecture', 'system', 'systems', 'distributed', 'scale', 'platform', 'invariant'],
  agentic: ['agent', 'agentic', 'agents', 'autonomy', 'guardrail'],
  migration: ['migration', 'migrate', 'legacy', 'cutover', 'rebuild', 'replace'],
  resilience: ['resilience', 'incident', 'failure', 'outage', 'security', 'recovery'],
  tooling: ['tooling', 'pipeline', 'automation', 'developer', 'rust', 'wasm', 'typescript']
};

@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements OnChanges, OnInit, OnDestroy {
  @Input() stageMode: StageMode = 'home';
  @Output() requestAccess = new EventEmitter<void>();
  @Output() responseStateChange = new EventEmitter<boolean>();

  readonly asciiFrames = ASCII_PORTRAIT_FRAMES;
  activeAsciiPortrait = ASCII_PORTRAIT_FRAMES[0];
  asciiMood: AsciiMood = 'architecture';
  question = '';
  isDisabled = false;
  activeResponseMarkdown = '';
  responseClosing = false;
  gateLocked = false;
  isAuthenticated = false;
  displayedMessage = '';
  displayedDots = '';

  private readonly anonymousResponseKey = 'dave2-anonymous-response-used';
  private readonly apiBaseUrl = environment.api.baseUrl.trim();
  private readonly apiGatewayKey = environment.api.gatewayKey.trim();
  private readonly typingSpeed = 50;
  private intervalId?: number;
  private dotsIntervalId?: number;
  private responseOpen = false;
  private responseCloseTimer?: number;
  private authSubscription?: Subscription;
  private asciiAnimationId?: number;
  private asciiSequencePosition = 0;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {
    this.authSubscription = this.auth.state$.subscribe((state) => {
      this.isAuthenticated = state.isAuthenticated;
      this.updateGateState();
    });
    this.updateGateState();
    this.startTyping('Dave 2.0 // online');
  }

  ngOnInit(): void {
    this.startAsciiAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['stageMode']) {
      return;
    }

    this.asciiMood = this.getMoodForStage(this.stageMode);
    if (!changes['stageMode'].firstChange && this.responseOpen) {
      if (this.responseCloseTimer) {
        window.clearTimeout(this.responseCloseTimer);
        this.responseCloseTimer = undefined;
      }
      this.activeResponseMarkdown = '';
      this.responseClosing = false;
      this.setResponseSurface(false);
    }
  }

  askQuestion(): void {
    const prompt = this.question.trim();
    if (!prompt) {
      return;
    }

    if (this.gateLocked) {
      this.activeResponseMarkdown = '';
      this.displayedMessage = '';
      return;
    }

    this.activeResponseMarkdown = '';
    this.asciiMood = this.detectMoodFromPrompt(prompt);
    this.isDisabled = true;
    this.displayedMessage = 'Thinking';
    this.startDotsAnimation();
    this.getData(prompt);
  }

  closeResponse(): void {
    if (this.responseClosing) {
      return;
    }

    this.responseClosing = true;
    this.responseCloseTimer = window.setTimeout(() => {
      this.activeResponseMarkdown = '';
      this.responseClosing = false;
      this.responseCloseTimer = undefined;
      this.setResponseSurface(false);
    }, 280);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
    }
    if (this.responseCloseTimer) {
      window.clearTimeout(this.responseCloseTimer);
    }
    if (this.asciiAnimationId) {
      window.clearInterval(this.asciiAnimationId);
    }
    this.authSubscription?.unsubscribe();
  }

  private startAsciiAnimation(): void {
    const reducedMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    this.asciiAnimationId = window.setInterval(() => {
      this.asciiSequencePosition = (this.asciiSequencePosition + 1) % ASCII_PORTRAIT_SEQUENCE.length;
      const frameIndex = ASCII_PORTRAIT_SEQUENCE[this.asciiSequencePosition];
      this.activeAsciiPortrait = this.asciiFrames[frameIndex];
    }, 180);
  }

  private getData(question: string): void {
    if (!this.apiBaseUrl) {
      this.stopDotsAnimation();
      this.completeAnswer('The brain endpoint is not configured.');
      return;
    }

    const body = { question };
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.apiGatewayKey) {
      headers = headers.set('x-api-key', this.apiGatewayKey);
    }

    this.http.post(this.apiBaseUrl, body, { headers, responseType: 'text' }).subscribe({
      next: (response) => {
        this.stopDotsAnimation();
        this.completeAnswer(this.getResponseText(response));
      },
      error: (error) => {
        this.stopDotsAnimation();
        console.error(error);
        this.completeAnswer(this.getErrorText(error));
      }
    });
  }

  private startDotsAnimation(): void {
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
    }

    let dotCount = 0;
    this.displayedDots = '';
    this.dotsIntervalId = window.setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      this.displayedDots = '.'.repeat(dotCount);
    }, 500);
  }

  private stopDotsAnimation(): void {
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
      this.dotsIntervalId = undefined;
    }
    this.displayedDots = '';
  }

  private startTyping(message: string): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }

    let index = 0;
    this.displayedMessage = '';
    this.intervalId = window.setInterval(() => {
      if (index < message.length) {
        this.displayedMessage += message[index];
        index += 1;
        return;
      }

      if (this.intervalId) {
        window.clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
      this.isDisabled = false;
    }, this.typingSpeed);
  }

  private getResponseText(response: unknown): string {
    if (typeof response === 'string') {
      const trimmed = response.trim();
      if (!trimmed) {
        return 'No response returned.';
      }

      if (this.looksLikeJson(trimmed)) {
        try {
          return this.getResponseText(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }

    if (!response || typeof response !== 'object') {
      return 'No response returned.';
    }

    const record = response as Record<string, unknown>;
    for (const key of ['answer', 'message', 'response', 'text']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    const body = record['body'];
    if (typeof body === 'string' && body.trim()) {
      try {
        return this.getResponseText(JSON.parse(body));
      } catch {
        return body.trim();
      }
    }
    if (body && typeof body === 'object') {
      return this.getResponseText(body);
    }
    return JSON.stringify(response, null, 2);
  }

  private getErrorText(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = this.getResponseText(error.error);
      if (backendMessage !== 'No response returned.') {
        return backendMessage;
      }
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
      }
      if (error.status) {
        return `Request failed with status ${error.status}.`;
      }
    }
    return 'Dave 2.0 is unavailable right now. Please try again shortly.';
  }

  private looksLikeJson(value: string): boolean {
    return (value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'));
  }

  private completeAnswer(message: string): void {
    this.activeResponseMarkdown = message;
    this.displayedMessage = '';
    this.isDisabled = false;
    this.setResponseSurface(true);
    if (!this.isAuthenticated) {
      this.markAnonymousResponseUsed();
      this.updateGateState();
    }
  }

  private setResponseSurface(open: boolean): void {
    if (this.responseOpen === open) {
      return;
    }
    this.responseOpen = open;
    this.responseStateChange.emit(open);
  }

  private updateGateState(): void {
    this.gateLocked = !this.isAuthenticated && this.hasAnonymousResponseBeenUsed();
  }

  private hasAnonymousResponseBeenUsed(): boolean {
    return typeof window !== 'undefined' && window.localStorage.getItem(this.anonymousResponseKey) === '1';
  }

  private markAnonymousResponseUsed(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.anonymousResponseKey, '1');
    }
  }

  private detectMoodFromPrompt(prompt: string): AsciiMood {
    const normalized = prompt.toLowerCase();
    let bestMood: AsciiMood = 'architecture';
    let bestScore = 0;

    (Object.entries(moodKeywords) as [AsciiMood, readonly string[]][]).forEach(([mood, keywords]) => {
      const score = keywords.filter((keyword) => normalized.includes(keyword)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMood = mood;
      }
    });
    return bestMood;
  }

  private getMoodForStage(stageMode: StageMode): AsciiMood {
    switch (stageMode) {
      case 'ventures':
      case 'greenlight':
        return 'agentic';
      case 'labs':
        return 'tooling';
      case 'anchorkeep':
        return 'resilience';
      default:
        return 'architecture';
    }
  }
}
