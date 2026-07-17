import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PreviewPolicy, PreviewResult, sanitizePreview } from './input-hardening-preview';

interface InputSample {
  readonly label: string;
  readonly policy: PreviewPolicy;
  readonly value: string;
}

@Component({
  selector: 'app-llm-input-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './llm-input-lab.component.html',
  styleUrl: './llm-input-lab.component.css'
})
export class LlmInputLabComponent {
  readonly policies: readonly { name: PreviewPolicy; label: string; use: string }[] = [
    { name: 'balanced_chat', label: 'Balanced chat', use: 'Free text' },
    { name: 'strict_exec', label: 'Strict exec', use: 'Tool arguments' },
    { name: 'code_mode', label: 'Code mode', use: 'Source text' }
  ];

  readonly samples: readonly InputSample[] = [
    {
      label: 'Invisible controls',
      policy: 'balanced_chat',
      value: 'Approve\u200B invoice 123\u202E'
    },
    {
      label: 'Tool argument',
      policy: 'strict_exec',
      value: 'customer\u2060_id=42\u200D&role=ａｄｍｉｎ'
    },
    {
      label: 'Mixed-script code',
      policy: 'code_mode',
      value: 'const role = "аdmin";\u2028run(role);'
    }
  ];

  policy: PreviewPolicy = this.samples[0].policy;
  inputText = this.samples[0].value;
  result: PreviewResult = sanitizePreview(this.inputText, this.policy);

  setPolicy(policy: PreviewPolicy) {
    this.policy = policy;
    this.refreshPreview();
  }

  loadSample(sample: InputSample) {
    this.policy = sample.policy;
    this.inputText = sample.value;
    this.refreshPreview();
  }

  updateInput(value: string) {
    this.inputText = value;
    this.refreshPreview();
  }

  trackPolicy(_index: number, policy: { name: PreviewPolicy }) {
    return policy.name;
  }

  trackSample(_index: number, sample: InputSample) {
    return sample.label;
  }

  private refreshPreview() {
    this.result = sanitizePreview(this.inputText, this.policy);
  }
}
