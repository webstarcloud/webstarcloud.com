import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CareerHighlight {
  readonly name: string;
  readonly context: string;
  readonly description: string;
  readonly result: string;
}

@Component({
  selector: 'app-about-experience',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about-experience.component.html',
  styleUrl: './about-experience.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutExperienceComponent {
  // Public claim wording follows career/claims.md and the selected CV.
  readonly highlights: readonly CareerHighlight[] = [
    {
      name: 'TMNL',
      context: 'Platform leadership · AWS & Azure',
      description: 'Led platform engineering across five Dutch banks. Built analytics and model-development infrastructure, owned penetration-test remediation and helped redesign identity and access control planes.',
      result: '$1.5M infrastructure cost reduction',
    },
    {
      name: 'LeasePlan',
      context: 'Global AWS platform · Schuberg Philis',
      description: 'Built the global AWS platform and completed its on-premises migration. Reusable Terraform and Kubernetes tooling enabled teams to bootstrap and deploy workloads themselves.',
      result: 'Migration completed in under 6 months',
    },
    {
      name: 'InvestSure',
      context: 'Serverless claims · solo delivery',
      description: 'Solo-built and launched the claims platform in under two months, using JavaScript and TypeScript on AWS with CI/CD and test automation.',
      result: 'Claims in under 10 seconds · less than $500/month',
    },
  ];

  readonly earlierWork: readonly CareerHighlight[] = [
    {
      name: 'Standard Bank',
      context: 'Personalisation · recovery build',
      description: 'Took over a failing ML platform and delivered its personalisation backend for a bank with more than 19 million customers.',
      result: 'Delivered in 3 months',
    },
    {
      name: 'Absa — ML Brand Audit',
      context: 'Applied ML · technical delivery',
      description: 'Built the AWS process engine and trained TensorFlow models for logo and text detection across a large rebrand audit.',
      result: '5,000 records in 30 minutes · 40,000 artefacts across 300 systems',
    },
    {
      name: 'Paycode',
      context: 'Identity & banking · on-premises',
      description: 'Shipped Java web services and C++ biometric backends across Guinea, Ghana, Namibia and Botswana, including bare-metal infrastructure, Linux virtualisation and on-site rollout.',
      result: 'Live customer systems across 4 countries',
    },
  ];
}
