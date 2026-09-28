import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HardeningReceipt } from './chat-hardening';

@Component({
  selector: 'app-hardening-receipt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="receipt" [class.blocked]="receipt.blocked" aria-label="Input protection result" role="status">
      <header><span>Dave’s Brain / Input protection</span><strong>{{ title }}</strong></header>
      <p *ngIf="receipt.blocked">The server stopped this request before it reached the language model.</p>
      <p *ngIf="!receipt.enabled">Input hardening was disabled for this request.</p>
      <ol aria-label="Request path">
        <li>Input received</li><li>{{ receipt.enabled ? 'Guard checked' : 'Guard disabled' }}</li>
        <li>{{ receipt.model_called ? 'Model called' : 'Model not called' }}</li>
      </ol>
      <ul *ngIf="receipt.reason_codes.length">
        <li *ngFor="let code of receipt.reason_codes"><span>{{ explain(code) }}</span><code>{{ code }}</code></li>
      </ul>
      <footer>
        <span *ngIf="receipt.library_version">llm-input-hardening {{ receipt.library_version }}</span>
        <span *ngIf="receipt.policy">{{ receipt.policy }}</span>
        <span *ngIf="receipt.action">Decision: {{ receipt.action }}</span>
        <span *ngIf="receipt.changed">Text changed</span>
        <a routerLink="/labs/llm-input-hardening">Explore the full report lab →</a>
      </footer>
    </section>
  `,
  styles: [`
    :host { display: block; margin: 24px 0; }
    .receipt { border: 1px solid #537760; border-radius: 8px; padding: 20px; background: #0d191c; color: #e7f3ec; font: 400 1rem/1.5 Roboto, Arial, sans-serif; }
    .blocked { border-color: #d6a961; background: #201a14; }
    header { display: flex; flex-direction: column; gap: 6px; }
    header span { font-size: .875rem; color: #a8cece; }
    header strong { font-size: 1.25rem; color: #b6ffa3; }
    .blocked header strong { color: #ffd18a; }
    p { margin: 10px 0; }
    ol { display: flex; flex-wrap: wrap; gap: 8px 24px; padding-left: 22px; }
    ul { list-style: none; padding: 0; margin: 16px 0; }
    ul li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 8px 0; border-top: 1px solid #ffffff20; }
    code { font-size: .875rem; color: #ffd18a; overflow-wrap: anywhere; }
    footer { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: .875rem; color: #b6c9c9; }
    a { color: #80e1ff; }
  `]
})
export class HardeningReceiptComponent {
  @Input({ required: true }) receipt!: HardeningReceipt;

  get title(): string {
    if (!this.receipt.enabled) { return 'Guard inactive'; }
    if (this.receipt.blocked) { return 'Blocked before the model'; }
    return this.receipt.model_called ? 'Input checked before answering' : 'Sample passed the guard';
  }

  explain(code: string): string {
    const labels: Record<string, string> = {
      IH001_BIDI_CONTROL: 'A hidden control changes text direction.',
      IH020_CONFUSABLE_MIXED_SCRIPT: 'Lookalike letters mix different writing systems.',
      IH033_ENCODED_RISKY_UNICODE: 'An encoding conceals a risky Unicode character.',
      IH034_ENCODED_UNICODE_INSPECTION_LIMIT: 'Encoded text reached the inspection limit.'
    };
    return labels[code] ?? code.replace(/^IH\d+_/, '').replace(/_/g, ' ').toLowerCase();
  }
}
