import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface VentureCard {
  name: string;
  boundary: string;
  stage: string;
  summary: string;
  icon: 'recovery' | 'capability' | 'simulation' | 'trust';
  route?: string;
}

@Component({
  selector: 'app-ventures',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ventures.component.html',
  styleUrls: ['../project-index.css', './ventures.component.css']
})
export class VenturesComponent {
  readonly ventures: VentureCard[] = [
    {
      name: 'Agent API Hardening / Blacksmith',
      boundary: 'Capability boundary',
      stage: 'Working preview',
      summary: 'Agent-safe SDK and MCP generation from OpenAPI specs, with dangerous operations gated out by construction.',
      icon: 'capability'
    },
    {
      name: 'Greenlight',
      boundary: 'Trust boundary',
      stage: 'Working POC',
      summary: 'A managed decision layer that governs consequential AI and human actions before execution.',
      icon: 'trust',
      route: '/greenlight'
    },
    {
      name: 'AnchorKeep',
      boundary: 'Recovery boundary',
      stage: 'Interactive demo',
      summary: 'A local-first Git origin, CI trail, and verified recovery path on object storage you control.',
      icon: 'recovery',
      route: '/ventures/anchorkeep'
    },
    {
      name: 'Holodeck',
      boundary: 'Simulation boundary',
      stage: 'Exploration',
      summary: 'Controlled environments for testing agents, workflows, and decision systems before they touch production.',
      icon: 'simulation'
    }
  ];
}
