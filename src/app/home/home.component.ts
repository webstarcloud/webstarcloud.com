import { Component } from '@angular/core';

interface Platform {
  name: string;
  context: string;
  blurb: string;
  metric: string;
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
      name: 'AnchorKeep',
      type: 'Lead venture',
      summary: 'Git origin, CI evidence, and verified recovery without a Git server.',
      route: '/ventures/anchorkeep',
      tone: 'lead'
    },
    {
      name: 'Greenlight',
      type: 'Working POC',
      summary: 'Govern consequential AI and human actions before execution.',
      route: '/greenlight',
      tone: 'private'
    },
    {
      name: 'llm-input-hardening',
      type: 'Public package',
      summary: 'Deterministic Unicode-aware hardening at the model input boundary.',
      route: '/labs/llm-input-hardening',
      tone: 'public'
    }
  ];

  // Built at scale — the production track record (credibility layer). Source: cv.pdf.
  readonly platforms: Platform[] = [
    {
      name: 'TMNL',
      context: 'Multi-bank · regulated',
      blurb: 'World-first privacy-preserving analytics across all Dutch national banks — PETs (MPC, homomorphic encryption, federated learning), SOC2 Type II.',
      metric: '−$3M infra cost (saved $1.5M)'
    },
    {
      name: 'Backbase',
      context: 'Agentic platform · current',
      blurb: 'A unified control plane for AI capabilities — agent governance and safe delivery inside regulated financial products.',
      metric: 'Agents, governed at scale'
    },
    {
      name: 'InvestSure',
      context: 'Insurtech · solo build',
      blurb: "The world's fastest event-driven claims platform, fully serverless on AWS — live in under two months.",
      metric: '<10s claims · <$500/mo'
    },
    {
      name: 'Standard Bank',
      context: 'Tier-1 bank',
      blurb: 'Customer data + ML platform unifying the experience across mobile and web; demoed directly to the CEO.',
      metric: '19M+ clients'
    },
    {
      name: 'ABSA — Brand-as-a-Service',
      context: 'Pan-African bank',
      blurb: 'Real-time ML pipelines on Kafka + Kubernetes for cross-channel personalization and brand governance.',
      metric: 'Billions of events/day · 12 countries'
    },
    {
      name: 'LeasePlan',
      context: 'Global fleet · migration',
      blurb: 'Global cloud platform with automated migration factories and reusable Terraform / Kubernetes patterns.',
      metric: 'Full on-prem migration <6 months'
    }
  ];
}
