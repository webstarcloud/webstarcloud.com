import { GreenlightVentureComponent } from './greenlight-venture.component';

describe('GreenlightVentureComponent', () => {
  let component: GreenlightVentureComponent;

  beforeEach(() => {
    component = new GreenlightVentureComponent();
  });

  it('excludes the requester from approving their own action', () => {
    expect(component.decision.decision).toBe('DENY');
    expect(component.canUsePrimaryAction).toBeFalse();
  });

  it('requires two distinct eligible approvers before execution', () => {
    component.selectActor('bob');
    component.runPrimaryAction();

    expect(component.approvalCount).toBe(1);
    expect(component.status).toBe('pending');

    component.selectActor('carol');
    component.runPrimaryAction();

    expect(component.approvalCount).toBe(2);
    expect(component.decision.decision).toBe('ALLOW');

    component.runPrimaryAction();

    expect(component.decision.decision).toBe('EXECUTED');
  });

  it('denies the action when an eligible approver rejects it', () => {
    component.selectActor('bob');
    component.reject();

    expect(component.decision.decision).toBe('DENY');
    expect(component.canUsePrimaryAction).toBeFalse();
  });
});
