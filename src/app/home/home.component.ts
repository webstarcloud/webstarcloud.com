import { Component } from '@angular/core';

interface Platform {
  name: string;
  context: string;
  blurb: string;
  metric: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  // Built at scale — the production track record (credibility layer). Source: cv.pdf.
  readonly platforms: Platform[] = [
    {
      name: 'TMNL',
      context: 'Multi-bank · regulated',
      blurb: 'Privacy-preserving analytics across national banks — PETs (MPC, homomorphic encryption, federated learning), SOC2 Type II.',
      metric: '−$1.5M infra cost'
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
