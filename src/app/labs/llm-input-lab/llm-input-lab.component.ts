import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface PolicyCard {
  name: string;
  use: string;
}

interface ScopeCard {
  title: string;
  copy: string;
}

@Component({
  selector: 'app-llm-input-lab',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './llm-input-lab.component.html',
  styleUrl: './llm-input-lab.component.css'
})
export class LlmInputLabComponent {
  readonly policies: PolicyCard[] = [
    { name: 'balanced_chat', use: 'General chat and prompt input' },
    { name: 'strict_exec', use: 'Tool arguments and execution-adjacent paths' },
    { name: 'code_mode', use: 'Code snippets and syntax-sensitive text' }
  ];

  readonly scope: ScopeCard[] = [
    {
      title: 'Input boundary',
      copy: 'Normalize Unicode, remove destabilizing invisible/control characters, and emit structured reports before text reaches prompts.'
    },
    {
      title: 'Text integrity',
      copy: 'Expose obfuscation signals such as bidi controls, zero-width characters, confusables, and encoding-shaped blobs.'
    },
    {
      title: 'Not semantic safety',
      copy: 'This is not prompt-injection prevention; it complements guardrails, tool allowlists, sandboxing, and output validation.'
    }
  ];
}
