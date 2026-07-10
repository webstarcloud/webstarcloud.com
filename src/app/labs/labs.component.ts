import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface LabCard {
  name: string;
  boundary: string;
  stage: string;
  summary: string;
  icon: 'input' | 'signal' | 'platform';
  route?: string;
}

@Component({
  selector: 'app-labs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './labs.component.html',
  styleUrls: ['../project-index.css', './labs.component.css']
})
export class LabsComponent {
  readonly labs: LabCard[] = [
    {
      name: 'llm-input-hardening',
      boundary: 'Input boundary',
      stage: 'Public package',
      summary: 'Deterministic Unicode-aware input hardening for LLM and agent applications.',
      icon: 'input',
      route: '/labs/llm-input-hardening'
    },
    {
      name: 'news-radar',
      boundary: 'Signal boundary',
      stage: 'Prototype',
      summary: 'Ranks noisy information streams so product and market decisions stay calm.',
      icon: 'signal'
    },
    {
      name: 'engineering-labs',
      boundary: 'Practice boundary',
      stage: 'Open research',
      summary: 'Cloud, platform, security, and systems experiments that document the engineering depth behind the products.',
      icon: 'platform'
    }
  ];
}
