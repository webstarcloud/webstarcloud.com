import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  AfterViewInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatModelId, ChatTurn } from '../chat/chat.models';
import {
  InputHardeningService,
  InspectionResult,
  visibleCharacters,
} from '../labs/llm-input-lab/input-hardening.service';

@Component({
  selector: 'app-chat-tools',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat-tools.component.html',
  styleUrl: './chat-tools.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatToolsComponent implements OnDestroy, AfterViewInit {
  @Input({ required: true }) panel!: 'protection' | 'performance';
  @Input({ required: true }) modelId!: ChatModelId;
  @Input() turns: ChatTurn[] = [];
  @Output() closed = new EventEmitter<void>();
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  private readonly inspector = inject(InputHardeningService);
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private request?: Subscription;
  readonly checking = signal(false);
  readonly result = signal<InspectionResult | null>(null);
  readonly error = signal('');
  text = 'Hello, curious world.';
  readonly visible = visibleCharacters;
  get measured() {
    return this.turns.filter(
      (turn) => turn.model.id === this.modelId && turn.status === 'complete' && turn.metrics,
    );
  }
  get cold() {
    return (
      this.measured.filter((turn) => turn.metrics?.startState === 'cold').slice(-1)[0]?.metrics
        ?.ttftMs ?? null
    );
  }
  get warm() {
    return (
      this.measured.filter((turn) => turn.metrics?.startState === 'warm').slice(-1)[0]?.metrics
        ?.ttftMs ?? null
    );
  }
  get latest() {
    return this.measured.slice(-1)[0]?.metrics;
  }
  ngAfterViewInit() {
    this.dialog?.nativeElement.showModal();
  }
  close() {
    this.closed.emit();
  }
  cancel(event: Event) {
    event.preventDefault();
    this.close();
  }
  reset() {
    this.request?.unsubscribe();
    this.checking.set(false);
    this.result.set(null);
    this.error.set('');
  }
  sample(encoded: boolean) {
    this.text = encoded ? 'abc&#x202E;def' : 'Hello, curious world.';
    this.reset();
  }
  inspect() {
    this.reset();
    if (!this.text.trim()) return;
    if ([...this.text].length > 2000) {
      this.error.set('Please keep the sample to 2,000 characters.');
      return;
    }
    this.checking.set(true);
    this.request = this.inspector.inspect(this.text, 'strict_exec').subscribe({
      next: (result) => {
        this.result.set(result);
        this.checking.set(false);
      },
      error: () => {
        this.error.set('The inspector is unavailable right now. No model was called.');
        this.checking.set(false);
      },
    });
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
    this.dialog?.nativeElement.close();
    this.previousFocus?.focus();
  }
}
