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
  styleUrl: './ventures.component.css'
})
export class VenturesComponent {
  readonly ventures: VentureCard[] = [
    {
      name: 'SafeGit',
      boundary: 'Recovery boundary',
      stage: 'Private preview',
      summary: 'A controlled Git safety layer for sensitive repositories, release evidence, and recovery-critical workflows.',
      icon: 'recovery',
      route: '/ventures/safegit'
    },
    {
      name: 'Blacksmith',
      boundary: 'Capability boundary',
      stage: 'Venture shaping',
      summary: 'Agent-safe SDK and MCP generation from OpenAPI specs, with dangerous operations gated out by construction.',
      icon: 'capability'
    },
    {
      name: 'Holodeck',
      boundary: 'Simulation boundary',
      stage: 'Exploration',
      summary: 'Controlled environments for testing agents, workflows, and decision systems before they touch production.',
      icon: 'simulation'
    },
    {
      name: 'Greenlight',
      boundary: 'Trust boundary',
      stage: 'Exploration',
      summary: 'A managed trust layer for governing AI and human actions before they are allowed to execute.',
      icon: 'trust'
    }
  ];
}
