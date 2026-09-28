import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { HardeningPolicy, InputHardeningService, InspectionResult, visibleCharacters } from './input-hardening.service';

interface InputSample {
  readonly label: string;
  readonly policy: HardeningPolicy;
  readonly value: string;
  readonly explanation: string;
}

@Component({
  selector: 'app-llm-input-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './llm-input-lab.component.html',
  styleUrl: './llm-input-lab.component.css'
})
export class LlmInputLabComponent implements OnDestroy {
  readonly maxCharacters = 2000;
  readonly visibleCharacters = visibleCharacters;
  readonly policies: readonly { name: HardeningPolicy; label: string; use: string }[] = [
    { name: 'balanced_chat', label: 'Balanced chat', use: 'Free text' },
    { name: 'strict_exec', label: 'Strict exec', use: 'Tool arguments' },
    { name: 'code_mode', label: 'Code mode', use: 'Source text' }
  ];
  readonly samples: readonly InputSample[] = [
    { label: 'Encoded bidi', policy: 'balanced_chat', value: 'abc&#x202E;def',
      explanation: 'An HTML entity hides a direction control. v3 flags the encoded risk and quarantines it while preserving the literal entity.' },
    { label: 'Invisible controls', policy: 'balanced_chat', value: 'Approve\u200B invoice 123\u202E',
      explanation: 'Invisible characters and a direction override can change how text is interpreted or displayed.' },
    { label: 'Nested encoding', policy: 'strict_exec', value: 'abc%26%23x202E%3Bdef',
      explanation: 'Percent encoding hides an HTML entity. Bounded inspection follows the decoding layers and reports the hidden control.' },
    { label: 'Mixed-script code', policy: 'code_mode', value: 'const role = "аdmin";\u2028run(role);',
      explanation: 'The first letter of “аdmin” is Cyrillic. Visually similar characters can conceal a different identifier.' },
    { label: 'Everyday text', policy: 'balanced_chat', value: 'Hello, café 👩‍💻 — مرحبا',
      explanation: 'Ordinary multilingual text and emoji help show what each policy preserves. Compare balanced chat with strict exec.' }
  ];

  policy: HardeningPolicy = this.samples[0].policy;
  inputText = this.samples[0].value;
  explanation = this.samples[0].explanation;
  result?: InspectionResult;
  loading = false;
  error = '';
  private request?: Subscription;

  constructor(private readonly hardener: InputHardeningService) {}

  get characterCount(): number { return [...this.inputText].length; }
  get inputVisible(): string { return visibleCharacters(this.inputText); }
  get reportJson(): string { return this.result ? JSON.stringify(this.result, null, 2) : ''; }
  get signals(): { code: string; count: number }[] {
    return Object.entries(this.result?.report.reason_codes ?? {}).map(([code, count]) => ({ code, count }));
  }
  get removedTotal(): number {
    return Object.values(this.result?.report.removed_counts ?? {}).reduce((sum, count) => sum + count, 0);
  }

  setPolicy(policy: HardeningPolicy): void {
    this.policy = policy;
    this.clearResult();
  }

  loadSample(sample: InputSample): void {
    this.policy = sample.policy;
    this.inputText = sample.value;
    this.explanation = sample.explanation;
    this.clearResult();
    this.inspect();
  }

  updateInput(value: string): void {
    this.inputText = value;
    this.explanation = '';
    this.clearResult();
  }

  inspect(): void {
    this.clearResult();
    if (this.characterCount > this.maxCharacters) {
      this.error = `Use up to ${this.maxCharacters} characters.`;
      return;
    }
    this.loading = true;
    this.request = this.hardener.inspect(this.inputText, this.policy).subscribe({
      next: result => { this.result = result; this.loading = false; },
      error: () => {
        this.error = 'Inspection is unavailable. Please try again shortly.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); }

  private clearResult(): void {
    this.request?.unsubscribe();
    this.result = undefined;
    this.error = '';
    this.loading = false;
  }
}
