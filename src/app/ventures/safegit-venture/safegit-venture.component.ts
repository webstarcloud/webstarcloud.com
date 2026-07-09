import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface ProductMetric {
  readonly value: string;
  readonly label: string;
}

interface WorkflowStep {
  readonly title: string;
  readonly description: string;
}

interface SecurityControl {
  readonly title: string;
  readonly description: string;
}

interface PlatformBuild {
  readonly name: string;
  readonly support: string;
  readonly status: string;
}

interface IntegrationBadge {
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
}

@Component({
  selector: 'app-safegit-venture',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './safegit-venture.component.html',
  styleUrl: './safegit-venture.component.css'
})
export class SafegitVentureComponent {
  title = 'SafeGit';

  readonly metrics: readonly ProductMetric[] = [
    { value: 'EU only', label: 'repository residency' },
    { value: 'Push gate', label: 'secret and policy checks' },
    { value: 'Audit pack', label: 'release evidence export' },
  ];

  readonly workflowSteps: readonly WorkflowStep[] = [
    {
      title: 'Import',
      description: 'Bring selected repositories into a clean EU workspace without copying the rest of your organization.',
    },
    {
      title: 'Protect',
      description: 'Scan pushes for secrets, sensitive paths, and policy drift before they reach a protected branch.',
    },
    {
      title: 'Approve',
      description: 'Require named reviewers, signed commits, and a release record before code leaves the workspace.',
    },
    {
      title: 'Export',
      description: 'Produce a compact evidence bundle for security reviews, procurement, and incident response.',
    },
  ];

  readonly securityControls: readonly SecurityControl[] = [
    {
      title: 'Sovereign storage',
      description: 'Repository data, build metadata, and audit events stay in EU regions by default.',
    },
    {
      title: 'Secret-aware Git',
      description: 'Push checks flag tokens, private keys, and environment files before they become history.',
    },
    {
      title: 'Release evidence',
      description: 'Every protected release can include reviewers, commit signatures, scan results, and retention notes.',
    },
  ];

  readonly platforms: readonly PlatformBuild[] = [
    { name: 'macOS', support: 'Apple silicon and Intel CLI builds', status: 'Beta waitlist' },
    { name: 'Linux', support: 'Debian, Ubuntu, and CI runner packages', status: 'Beta waitlist' },
    { name: 'Windows', support: 'PowerShell installer and signed binaries', status: 'Planned' },
  ];

  readonly integrations: readonly IntegrationBadge[] = [
    {
      name: 'GitHub import',
      description: 'Mirror or migrate selected repositories while keeping sensitive work isolated.',
      imageUrl: 'assets/images/github.png',
      imageAlt: 'GitHub logo',
    },
    {
      name: 'AWS EU hosting',
      description: 'Built around EU-region infrastructure and identity-aware access paths.',
      imageUrl: 'assets/images/amazon-logo-white-aws-png.png',
      imageAlt: 'AWS logo',
    },
    {
      name: 'GDPR records',
      description: 'Keep retention, access, and release evidence ready for review.',
      imageUrl: 'assets/images/gdpr.png',
      imageAlt: 'GDPR badge',
    },
  ];

  constructor(private readonly authService: AuthService) {}

  login(): void {
    this.authService.signIn('/safegit');
  }
}
