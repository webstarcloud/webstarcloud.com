import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';

type AnchorKeepView = 'activity' | 'recovery';
type DemoOutcome = 'success' | 'failed';
type DemoEventState = 'pending' | 'running' | 'complete' | 'evidence' | 'failed';
type RecoveryState = 'idle' | 'running' | 'verified';

interface DemoRepository {
  readonly id: string;
  readonly name: string;
  readonly branch: string;
  readonly sha: string;
  readonly storage: string;
  readonly command: string;
  readonly successLine: string;
  readonly fileCount: number;
}

interface PushEvent {
  readonly state: DemoEventState;
  readonly title: string;
  readonly detail: string;
  readonly meta: string;
}

interface RecoveryCheck {
  readonly label: string;
  readonly detail: string;
  readonly state: 'pending' | 'running' | 'complete';
}

const DEMO_STEP_DELAY_MS = 650;
const RECOVERY_STEP_DELAY_MS = 450;
const DEMO_QUEUED_AT = '2026-07-15T09:10:46Z';
const DEMO_STARTED_AT = '2026-07-15T09:10:47Z';
const DEMO_FINISHED_AT = '2026-07-15T09:10:49Z';

@Component({
  selector: 'app-anchorkeep-venture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anchorkeep-venture.component.html',
  styleUrl: './anchorkeep-venture.component.css'
})
export class AnchorKeepVentureComponent implements OnDestroy {
  readonly repositories: readonly DemoRepository[] = [
    {
      id: 'anchorkeep',
      name: 'anchorkeep',
      branch: 'main',
      sha: 'cbdbe0b',
      storage: 's3://demo-owner-code/anchorkeep',
      command: 'cargo test',
      successLine: '3 tests passed; 0 failed',
      fileCount: 34
    },
    {
      id: 'anchorkeep-pipe',
      name: 'anchorkeep-pipe',
      branch: 'main',
      sha: '62fd8b9',
      storage: 's3://demo-owner-code/anchorkeep-pipe',
      command: 'npm test -- --runInBand',
      successLine: '42 tests passed; 0 failed',
      fileCount: 56
    },
    {
      id: 'webstarcloud.com',
      name: 'webstarcloud.com',
      branch: 'main',
      sha: '6b310d8',
      storage: 's3://demo-owner-code/webstarcloud.com',
      command: 'npm run build',
      successLine: 'browser bundle generated',
      fileCount: 128
    }
  ];

  activeView: AnchorKeepView = 'activity';
  selectedRepositoryId = this.repositories[0].id;
  selectedOutcome: DemoOutcome = 'success';
  currentStage = 0;
  recoveryStage = 0;
  recoveryState: RecoveryState = 'idle';
  isRunning = false;

  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  get selectedRepository(): DemoRepository {
    return this.repositories.find((repository) => repository.id === this.selectedRepositoryId)
      ?? this.repositories[0];
  }

  get isTerminal(): boolean {
    return this.currentStage === 6;
  }

  get runState(): 'not-started' | 'packing' | 'queued' | 'running' | DemoOutcome {
    if (this.currentStage === 0) return 'not-started';
    if (this.currentStage < 4) return 'packing';
    if (this.currentStage === 4) return 'queued';
    if (this.currentStage === 5) return 'running';
    return this.selectedOutcome;
  }

  get activity(): readonly PushEvent[] {
    const repository = this.selectedRepository;
    return [
      {
        state: this.eventState(1),
        title: 'Immutable pack stored',
        detail: 'The Rust remote helper writes one self-contained Git pack.',
        meta: `${repository.name}/objects/packs/4f8c…pack`
      },
      {
        state: this.eventState(2),
        title: 'Reference advanced',
        detail: 'The branch ref moves with compare-and-swap; a lost race fails loudly.',
        meta: `${repository.name}/refs/heads/${repository.branch} · If-Match`
      },
      {
        state: this.eventState(3, true),
        title: 'Push marker written last',
        detail: 'The marker exists only after the code and ref are durable.',
        meta: `${repository.name}/events/push/${repository.branch}/${repository.sha}.json`
      },
      {
        state: this.eventState(4),
        title: 'Run claimed and queued',
        detail: 'AnchorKeep Pipe deduplicates the event and creates its initial status.',
        meta: `${repository.name}/ci/${repository.sha}/status.json · If-None-Match: *`
      },
      {
        state: this.eventState(5),
        title: 'Single-use MicroVM',
        detail: `An ephemeral base runner executes “${repository.command}”.`,
        meta: 'prefix-scoped STS credentials · no standing runner'
      },
      {
        state: this.eventState(6, false, true),
        title: 'Terminal status persisted',
        detail: 'Every run resolves to success, failed, or timed_out so clients never poll forever.',
        meta: `${this.selectedOutcome} · logs remain beside the stored commit`
      }
    ];
  }

  get contractObjectKey(): string {
    const repository = this.selectedRepository;
    if (this.currentStage < 4) {
      return `${repository.name}/events/push/${repository.branch}/${repository.sha}.json`;
    }
    return `${repository.name}/ci/${repository.sha}/status.json`;
  }

  get contractObjectLabel(): string {
    if (this.currentStage < 3) return 'Push marker preview';
    if (this.currentStage === 3) return 'Push marker · written';
    return 'Run status · contract v1';
  }

  get contractJson(): string {
    const repository = this.selectedRepository;
    if (this.currentStage < 4) {
      return JSON.stringify({
        contract: 1,
        repo: repository.name,
        branch: repository.branch,
        sha: repository.sha,
        pack: '4f8ce0c7…',
        pushed_at: DEMO_QUEUED_AT,
        pusher: 'demo@local'
      }, null, 2);
    }

    const state = this.runState;
    const hasStarted = this.currentStage >= 5;
    const hasFinished = this.currentStage >= 6;
    const stepState = hasFinished ? this.selectedOutcome : 'running';
    const steps = hasStarted ? [{
      index: 0,
      name: 'test',
      state: stepState,
      exit_code: hasFinished ? (this.selectedOutcome === 'success' ? 0 : 1) : null,
      started_at: DEMO_STARTED_AT,
      finished_at: hasFinished ? DEMO_FINISHED_AT : null,
      log: 'steps/0.log'
    }] : [];

    return JSON.stringify({
      contract: 1,
      repo: repository.name,
      branch: repository.branch,
      sha: repository.sha,
      state,
      queued_at: DEMO_QUEUED_AT,
      started_at: hasStarted ? DEMO_STARTED_AT : null,
      finished_at: hasFinished ? DEMO_FINISHED_AT : null,
      steps,
      error: hasFinished && this.selectedOutcome === 'failed'
        ? `step “test” exited with code 1`
        : null
    }, null, 2);
  }

  get terminalOutput(): string {
    const repository = this.selectedRepository;
    const lines = [
      `$ git push anchorkeep ${repository.branch}`,
      `anchorkeep::s3://demo-owner-code/${repository.name}`
    ];

    if (this.currentStage >= 1) lines.push('anchorkeep: wrote immutable pack 4f8ce0c7…');
    if (this.currentStage >= 2) lines.push(`anchorkeep: advanced refs/heads/${repository.branch} (CAS)`);
    if (this.currentStage >= 3) lines.push(`anchorkeep: wrote events/push/${repository.branch}/${repository.sha}.json last`);
    if (this.currentStage >= 4) lines.push('pipe: claimed run · status → queued');
    if (this.currentStage >= 5) {
      lines.push('pipe: ephemeral base MicroVM started');
      lines.push(`runner: ${repository.command}`);
    }
    if (this.currentStage >= 6) {
      lines.push(this.selectedOutcome === 'success'
        ? `runner: ${repository.successLine}`
        : 'runner: command exited with code 1');
      lines.push(`pipe: status → ${this.selectedOutcome} (terminal)`);
    }

    return lines.join('\n');
  }

  get recoveryChecks(): readonly RecoveryCheck[] {
    const repository = this.selectedRepository;
    return [
      {
        label: 'Pack integrity',
        detail: 'git index-pack verified',
        state: this.recoveryCheckState(1)
      },
      {
        label: 'Repository graph',
        detail: 'git fsck --full --strict',
        state: this.recoveryCheckState(2)
      },
      {
        label: 'Working tree',
        detail: `${repository.fileCount} files match manifest`,
        state: this.recoveryCheckState(3)
      }
    ];
  }

  get recoveryOutput(): string {
    const repository = this.selectedRepository;
    const lines = [
      `$ git clone anchorkeep::s3://demo-owner-code/${repository.name}`
    ];
    if (this.recoveryStage >= 1) lines.push('receiving immutable pack ... done');
    if (this.recoveryStage >= 2) lines.push('verifying object graph ... passed');
    if (this.recoveryStage >= 3) lines.push('checking working tree manifest ... passed');
    if (this.recoveryStage >= 4) lines.push(`HEAD ${repository.sha} · SAFE TO RECOVER`);
    return lines.join('\n');
  }

  selectRepository(repositoryId: string): void {
    this.selectedRepositoryId = repositoryId;
    this.resetDemo();
  }

  setView(view: AnchorKeepView): void {
    this.activeView = view;
  }

  setOutcome(outcome: DemoOutcome): void {
    if (!this.isRunning) this.selectedOutcome = outcome;
  }

  runDemo(): void {
    this.clearTimers();
    this.activeView = 'activity';
    this.currentStage = 1;
    this.recoveryStage = 0;
    this.recoveryState = 'idle';
    this.isRunning = true;

    for (let stage = 2; stage <= 6; stage += 1) {
      const timer = setTimeout(() => {
        this.currentStage = stage;
        if (stage === 6) this.isRunning = false;
      }, (stage - 1) * DEMO_STEP_DELAY_MS);
      this.timers.push(timer);
    }
  }

  resetDemo(): void {
    this.clearTimers();
    this.currentStage = 0;
    this.recoveryStage = 0;
    this.recoveryState = 'idle';
    this.isRunning = false;
  }

  verifyRecovery(): void {
    if (!this.isTerminal || this.recoveryState === 'running') return;

    this.clearTimers();
    this.activeView = 'recovery';
    this.recoveryStage = 1;
    this.recoveryState = 'running';

    for (let stage = 2; stage <= 4; stage += 1) {
      const timer = setTimeout(() => {
        this.recoveryStage = stage;
        if (stage === 4) this.recoveryState = 'verified';
      }, (stage - 1) * RECOVERY_STEP_DELAY_MS);
      this.timers.push(timer);
    }
  }

  repositoryStatus(repository: DemoRepository): string {
    if (repository.id !== this.selectedRepositoryId || this.currentStage === 0) return 'Demo ready';
    if (this.currentStage < 4) return 'Pushing';
    if (this.currentStage < 6) return 'CI running';
    return this.selectedOutcome === 'success' ? 'CI passed' : 'CI failed';
  }

  trackRepository(_index: number, repository: DemoRepository): string {
    return repository.id;
  }

  trackEvent(_index: number, event: PushEvent): string {
    return event.title;
  }

  trackRecoveryCheck(_index: number, check: RecoveryCheck): string {
    return check.label;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private eventState(stage: number, evidence = false, terminal = false): DemoEventState {
    if (this.currentStage < stage) return 'pending';
    if (this.currentStage === stage) {
      if (terminal) return this.selectedOutcome === 'success' ? 'complete' : 'failed';
      return 'running';
    }
    return evidence ? 'evidence' : 'complete';
  }

  private recoveryCheckState(stage: number): RecoveryCheck['state'] {
    if (this.recoveryStage < stage) return 'pending';
    if (this.recoveryStage === stage && this.recoveryState === 'running') return 'running';
    return 'complete';
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.length = 0;
  }
}
