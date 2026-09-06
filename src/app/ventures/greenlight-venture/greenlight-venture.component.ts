import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GreenlightWalkthroughComponent } from './greenlight-walkthrough.component';

type ActorId = 'alice' | 'bob' | 'carol';
type RunStatus = 'pending' | 'approved' | 'rejected' | 'executed';
type VoteDecision = 'approve' | 'reject';

interface DemoActor {
  readonly id: ActorId;
  readonly name: string;
  readonly role: string;
  readonly eligible: boolean;
}

interface ApprovalVote {
  readonly actor: ActorId;
  readonly decision: VoteDecision;
}

interface AuditEvent {
  readonly id: number;
  readonly label: string;
  readonly tone: 'neutral' | 'allow' | 'deny' | 'pending';
}

interface DecisionSnapshot {
  readonly decision: 'ALLOW' | 'DENY' | 'PENDING_APPROVAL' | 'EXECUTED';
  readonly reason: string;
}

@Component({
  selector: 'app-greenlight-venture',
  standalone: true,
  imports: [CommonModule, RouterModule, GreenlightWalkthroughComponent],
  templateUrl: './greenlight-venture.component.html',
  styleUrl: './greenlight-venture.component.css'
})
export class GreenlightVentureComponent {
  readonly actors: readonly DemoActor[] = [
    { id: 'alice', name: 'Alice', role: 'Requester', eligible: false },
    { id: 'bob', name: 'Bob', role: 'Finance approver', eligible: true },
    { id: 'carol', name: 'Carol', role: 'Risk approver', eligible: true }
  ];

  currentActorId: ActorId = 'alice';
  resourceNumber = 123;
  status: RunStatus = 'pending';
  votes: ApprovalVote[] = [];
  auditEvents: AuditEvent[] = [];
  private auditSequence = 0;

  constructor() {
    this.resetRun(false);
  }

  get currentActor() {
    return this.actors.find((actor) => actor.id === this.currentActorId)!;
  }

  get resource() {
    return `invoice:${this.resourceNumber}`;
  }

  get approvalCount() {
    return this.votes.filter((vote) => vote.decision === 'approve').length;
  }

  get decision(): DecisionSnapshot {
    if (this.status === 'executed') {
      return { decision: 'EXECUTED', reason: 'The approved action has executed.' };
    }

    if (this.status === 'approved') {
      return { decision: 'ALLOW', reason: 'Required independent approvals are complete.' };
    }

    if (this.status === 'rejected') {
      return { decision: 'DENY', reason: 'An eligible approver rejected the request.' };
    }

    if (!this.currentActor.eligible) {
      return { decision: 'DENY', reason: 'The requester cannot approve their own action.' };
    }

    if (this.hasVoted(this.currentActorId)) {
      return { decision: 'DENY', reason: 'This actor has already recorded a decision.' };
    }

    return { decision: 'PENDING_APPROVAL', reason: 'This actor may record an independent approval.' };
  }

  get primaryLabel() {
    if (this.status === 'approved') {
      return 'Execute action';
    }

    if (this.status === 'executed') {
      return 'Action executed';
    }

    return 'Approve request';
  }

  get canUsePrimaryAction() {
    return this.status === 'approved' || (
      this.status === 'pending' &&
      this.currentActor.eligible &&
      !this.hasVoted(this.currentActorId)
    );
  }

  get canReject() {
    return this.status === 'pending' && this.currentActor.eligible && !this.hasVoted(this.currentActorId);
  }

  selectActor(actor: ActorId) {
    this.currentActorId = actor;
    this.addAudit(`Identity changed to ${actor}.`, 'neutral');
  }

  runPrimaryAction() {
    if (this.status === 'approved') {
      this.status = 'executed';
      this.addAudit(`${this.resource} executed after policy completion.`, 'allow');
      return;
    }

    if (!this.canUsePrimaryAction) {
      return;
    }

    this.votes = [...this.votes, { actor: this.currentActorId, decision: 'approve' }];
    this.addAudit(`${this.currentActor.name} approved ${this.resource}.`, 'pending');

    if (this.approvalCount >= 2) {
      this.status = 'approved';
      this.addAudit('four_eyes_v1 satisfied. Action is now allowed.', 'allow');
    }
  }

  reject() {
    if (!this.canReject) {
      return;
    }

    this.votes = [...this.votes, { actor: this.currentActorId, decision: 'reject' }];
    this.status = 'rejected';
    this.addAudit(`${this.currentActor.name} rejected ${this.resource}.`, 'deny');
  }

  resetRun(advance = true) {
    if (advance) {
      this.resourceNumber += 1;
    }

    this.status = 'pending';
    this.currentActorId = 'alice';
    this.votes = [];
    this.auditEvents = [];
    this.auditSequence = 0;
    this.addAudit(`${this.resource} requested under four_eyes_v1.`, 'pending');
  }

  hasApproved(actor: ActorId) {
    return this.votes.some((vote) => vote.actor === actor && vote.decision === 'approve');
  }

  trackActor(_index: number, actor: DemoActor) {
    return actor.id;
  }

  trackAudit(_index: number, event: AuditEvent) {
    return event.id;
  }

  private hasVoted(actor: ActorId) {
    return this.votes.some((vote) => vote.actor === actor);
  }

  private addAudit(label: string, tone: AuditEvent['tone']) {
    this.auditSequence += 1;
    this.auditEvents = [
      { id: this.auditSequence, label, tone },
      ...this.auditEvents
    ].slice(0, 8);
  }
}
