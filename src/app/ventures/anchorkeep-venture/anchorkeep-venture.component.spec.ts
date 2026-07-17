import { AnchorKeepVentureComponent } from './anchorkeep-venture.component';

describe('AnchorKeepVentureComponent', () => {
  let component: AnchorKeepVentureComponent;

  beforeEach(() => {
    jasmine.clock().install();
    component = new AnchorKeepVentureComponent();
  });

  afterEach(() => {
    component.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('models the repositories that make up the public demo', () => {
    expect(component.repositories.map((repository) => repository.name)).toEqual([
      'anchorkeep',
      'anchorkeep-pipe',
      'webstarcloud.com'
    ]);
  });

  it('runs a safe push through a terminal success status', () => {
    component.runDemo();

    expect(component.currentStage).toBe(1);
    expect(component.runState).toBe('packing');

    jasmine.clock().tick(4_000);

    expect(component.currentStage).toBe(6);
    expect(component.runState).toBe('success');
    expect(component.isRunning).toBeFalse();
    expect(JSON.parse(component.contractJson).state).toBe('success');
    expect(component.terminalOutput).toContain('status → success (terminal)');
  });

  it('demonstrates a failed command while still reaching a terminal status', () => {
    component.setOutcome('failed');
    component.runDemo();
    jasmine.clock().tick(4_000);

    const status = JSON.parse(component.contractJson);
    expect(status.state).toBe('failed');
    expect(status.steps[0].exit_code).toBe(1);
    expect(status.error).toContain('exited with code 1');
  });

  it('verifies recovery independently of the pipeline result', () => {
    component.setOutcome('failed');
    component.runDemo();
    jasmine.clock().tick(4_000);

    component.verifyRecovery();
    expect(component.recoveryState).toBe('running');

    jasmine.clock().tick(2_000);

    expect(component.recoveryState).toBe('verified');
    expect(component.recoveryOutput).toContain('SAFE TO RECOVER');
    expect(component.recoveryChecks.every((check) => check.state === 'complete')).toBeTrue();
  });

  it('cancels an active simulation when reset', () => {
    component.runDemo();
    component.resetDemo();
    jasmine.clock().tick(4_000);

    expect(component.currentStage).toBe(0);
    expect(component.runState).toBe('not-started');
    expect(component.isRunning).toBeFalse();
  });
});
