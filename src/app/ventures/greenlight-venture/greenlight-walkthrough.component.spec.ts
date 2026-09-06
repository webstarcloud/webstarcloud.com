import { GreenlightWalkthroughComponent } from './greenlight-walkthrough.component';

describe('GreenlightWalkthroughComponent', () => {
  let component: GreenlightWalkthroughComponent;

  beforeEach(() => {
    jasmine.clock().install();
    component = new GreenlightWalkthroughComponent();
  });

  afterEach(() => {
    component.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('runs the company tour through two reviewers and stops at its receipt', () => {
    component.play();
    jasmine.clock().tick(3 * 3600);
    expect(component.step).toBe(3);
    jasmine.clock().tick(3600);
    expect(component.approvals).toBe(1);
    expect(component.step).toBe(3);
    jasmine.clock().tick(3600);
    expect(component.step).toBe(4);
    expect(component.approvals).toBe(2);
    expect(component.playing).toBeFalse();
  });

  it('stops the tour when a person declines and cannot subsequently approve it', () => {
    component.selectChapter(3);
    component.play();
    component.reject();
    component.approve();
    jasmine.clock().tick(20_000);
    expect(component.rejected).toBeTrue();
    expect(component.step).toBe(3);
    expect(component.approvals).toBe(0);
    expect(component.playing).toBeFalse();
  });

  it('clears company review state when switching to the managed setup', () => {
    component.selectChapter(3);
    component.approve();
    component.play();
    component.chooseMode('managed');
    jasmine.clock().tick(20_000);
    expect(component.step).toBe(0);
    expect(component.approvals).toBe(0);
    expect(component.playing).toBeFalse();
    component.selectChapter(3);
    component.approve();
    expect(component.step).toBe(4);
    expect(component.approvals).toBe(1);
  });

  it('pauses on chapter selection and cancels timers when destroyed', () => {
    component.play();
    component.selectChapter(1);
    jasmine.clock().tick(20_000);
    expect(component.step).toBe(1);
    component.play();
    component.ngOnDestroy();
    jasmine.clock().tick(20_000);
    expect(component.step).toBe(1);
    expect(component.playing).toBeFalse();
  });
});
