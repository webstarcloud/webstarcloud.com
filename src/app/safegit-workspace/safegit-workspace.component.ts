import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface WorkspaceMetric {
  label: string;
  value: string;
}

interface RepositoryRow {
  name: string;
  branch: string;
  status: string;
  evidence: string;
}

@Component({
  selector: 'app-safegit-workspace',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './safegit-workspace.component.html',
  styleUrl: './safegit-workspace.component.css'
})
export class SafegitWorkspaceComponent {
  readonly authState$ = this.auth.state$;

  readonly metrics: WorkspaceMetric[] = [
    { label: 'Protected repos', value: '3' },
    { label: 'Restore checks', value: '12' },
    { label: 'Open risks', value: '0' }
  ];

  readonly repositories: RepositoryRow[] = [
    { name: 'payments-api', branch: 'main', status: 'Protected', evidence: 'Ready' },
    { name: 'agent-control-plane', branch: 'release/0.3', status: 'Review gate', evidence: 'Building' },
    { name: 'trustlayer-sdk', branch: 'main', status: 'Protected', evidence: 'Ready' }
  ];

  constructor(private readonly auth: AuthService) {}

  signOut() {
    this.auth.signOut();
  }
}
