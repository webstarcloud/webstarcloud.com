import { Component } from '@angular/core';

interface Platform {
  readonly name: string;
  readonly kind: 'Production' | 'Current';
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
      summary: 'A published Python package with a Rust core for Unicode-aware text hardening, with fuzzing, telemetry and reproducible benchmarks.',
      route: '/labs/llm-input-hardening',
      tone: 'public'
    }
  ];

  // Claim wording and maturity are tracked in career/claims.md.
  readonly platforms: Platform[] = [
    {
      name: 'TMNL',
      kind: 'Production',
      context: 'Platform leadership · AWS & Azure',
      blurb: 'Led platform engineering across five Dutch banks. Built analytics and model-development infrastructure, owned penetration-test remediation and helped redesign identity and access control planes.',
      metric: '$1.5M infrastructure cost reduction'
    },
    {
      name: 'LeasePlan',
      kind: 'Production',
      context: 'Global AWS platform · Schuberg Philis',
      blurb: 'Built the global AWS platform and completed its on-premises migration. Reusable Terraform and Kubernetes tooling enabled teams to bootstrap and deploy workloads themselves.',
      metric: 'Migration completed in under 6 months'
    },
    {
      name: 'InvestSure',
      kind: 'Production',
      context: 'Serverless claims · solo delivery',
      blurb: 'Solo-built and launched the claims platform in under two months, using JavaScript and TypeScript on AWS with CI/CD and test automation.',
      metric: '<10s claims · <$500/mo'
    },
    {
      name: 'Backbase',
      kind: 'Current',
      context: 'Principal Solution Architect · Azure',
      blurb: 'Lead the architecture for Backbase’s new BankOS and build the shared agentic platform, including control and data plane APIs. Turn recurring requirements into reusable platform capabilities.',
      metric: 'Multiple internal and external customer projects are live in production.'
    },
    {
      name: 'Standard Bank',
      kind: 'Production',
      context: 'Personalisation · recovery build',
      blurb: 'Took over a failing ML platform and delivered its personalisation backend for a bank with more than 19 million customers.',
      metric: 'Delivered in 3 months'
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
      context: 'Identity & banking · on-premises',
      blurb: 'Shipped Java web services and C++ biometric backends across Guinea, Ghana, Namibia and Botswana, including bare-metal infrastructure, Linux virtualisation and on-site rollout.',
      metric: 'Live customer systems · 4 countries'
    }
  ];
}
