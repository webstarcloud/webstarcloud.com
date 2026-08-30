import { Component } from '@angular/core';

interface Platform {
  readonly name: string;
  readonly kind: 'Production' | 'R&D';
  readonly context: string;
  readonly blurb: string;
  readonly metric: string;
}

interface SelectedWork {
  readonly name: string;
  readonly type: string;
  readonly summary: string;
  readonly route: string;
  readonly tone: 'lead' | 'private' | 'public';
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  readonly selectedWork: readonly SelectedWork[] = [
    {
      name: 'llm-input-hardening',
      type: 'AI security · Public package',
      summary: 'Deterministic Unicode-aware hardening at the model input boundary.',
      route: '/labs/llm-input-hardening',
      tone: 'public'
    },
    {
      name: 'Agent API Hardening / Blacksmith',
      type: 'Agent infrastructure · Working preview',
      summary: 'Least-capability SDK and MCP surfaces generated from real OpenAPI contracts.',
      route: '/ventures',
      tone: 'lead'
    },
    {
      name: 'Greenlight',
      type: 'Agent governance · Working POC',
      summary: 'Govern consequential AI and human actions before execution.',
      route: '/greenlight',
      tone: 'private'
    }
  ];

  // Claim wording and maturity are tracked in career/claims.md.
  readonly platforms: Platform[] = [
    {
      name: 'Backbase',
      kind: 'Production',
      context: 'Agent infrastructure · current',
      blurb: 'Building the agentic platform across application and infrastructure layers, including APIs behind its control and data planes.',
      metric: 'One agentic use case live'
    },
    {
      name: 'Absa — ML Brand Audit',
      kind: 'Production',
      context: 'Applied ML · technical delivery',
      blurb: 'Built the AWS process engine and trained TensorFlow models for logo and text detection across a large rebrand audit.',
      metric: '5,000 records/30 min · 40,000 artefacts/300 systems'
    },
    {
      name: 'Paycode',
      kind: 'Production',
      context: 'Identity & payments · hands-on',
      blurb: 'Built and shipped Java web services and C++ biometric backends for identity, remittance, KYC and AML deployments.',
      metric: 'Live customer systems · 4 countries'
    },
    {
      name: 'TMNL',
      kind: 'Production',
      context: 'Multi-bank data & ML platform',
      blurb: 'Architected secure analytics across five Dutch banks, with privacy boundaries and MLOps that contributed to its SOC 2 Type II environment.',
      metric: '$1.5M documented savings'
    },
    {
      name: 'Standard Bank',
      kind: 'Production',
      context: 'Personalisation · recovery build',
      blurb: 'Took over a failing ML platform and delivered its personalisation backend for a bank with more than 19 million customers.',
      metric: 'Delivered in 3 months'
    },
    {
      name: 'InvestSure',
      kind: 'Production',
      context: 'Insurtech · 0→1 solo build',
      blurb: 'An event-driven claims platform built fully serverless on AWS — live in under two months.',
      metric: '<10s claims · <$500/mo'
    },
    {
      name: 'GPU & model systems',
      kind: 'R&D',
      context: 'Hands-on exploration',
      blurb: 'Worked with AWS P5/H100, ParallelCluster and Slurm; trained CNN, LSTM and NLP models with TensorFlow and PyTorch; built Lab271 prototypes with autoencoders and deepfakes.',
      metric: 'R&D · not presented as production'
    }
  ];
}
