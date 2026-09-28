import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { GoblinChamberComponent } from './goblin-chamber.component';
import { FIRST_RUN, FundingService, FundingState } from './funding.service';
import { ParticlesModule } from '../particles/particles.module';

describe('GoblinChamberComponent', () => {
  let fixture: ComponentFixture<GoblinChamberComponent>;
  let states: BehaviorSubject<FundingState>;
  beforeEach(async () => {
    states = new BehaviorSubject<FundingState>({kind:'setup'});
    await TestBed.configureTestingModule({
      imports:[GoblinChamberComponent, RouterTestingModule],
      providers:[{provide:FundingService, useValue:{state$:states}}]
    }).overrideComponent(GoblinChamberComponent, {remove:{imports:[ParticlesModule]}, add:{schemas:[NO_ERRORS_SCHEMA]}}).compileComponents();
    fixture = TestBed.createComponent(GoblinChamberComponent); fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());
  const funded = (amount: number, status: 'collecting'|'funded'): FundingState => ({kind:'ready', snapshot:{campaignId:FIRST_RUN.id, currency:'USD', targetMinor:7200, receivedMinor:amount, status, updatedAt:new Date().toISOString(), checkoutUrl:'https://buy.stripe.com/test_example'}});
  it('shows pending setup without a pretend balance or checkout', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Awaiting payment setup');
    expect(element.textContent).toContain('US$72');
    expect(element.querySelector('progress')).toBeNull();
    expect(element.querySelector('a[href^="https://buy.stripe.com"]')).toBeNull();
  });
  it('fills from verified amounts and closes checkout at the target; failed reads hide the balance', () => {
    const element = fixture.nativeElement as HTMLElement;
    states.next(funded(1800, 'collecting')); fixture.detectChanges();
    expect(element.querySelector<HTMLElement>('.fluid--front')?.style.height).toBe('25%');
    expect(element.querySelector('a[href^="https://buy.stripe.com"]')).not.toBeNull();
    states.next(funded(7500, 'funded')); fixture.detectChanges();
    expect(element.querySelector<HTMLElement>('.fluid--front')?.style.height).toBe('100%');
    expect(element.textContent).toContain('$75');
    expect(element.querySelector('a[href^="https://buy.stripe.com"]')).toBeNull();
    states.next({kind:'unavailable'}); fixture.detectChanges();
    expect(element.querySelector('progress')).toBeNull();
    expect(element.querySelector<HTMLElement>('.fluid--front')?.style.height).toBe('0%');
    expect(element.textContent).toContain('Funding status unavailable');
  });
  it('exposes a working, pressed-state animation toggle', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const before = fixture.componentInstance.paused(); button.click(); fixture.detectChanges();
    expect(fixture.componentInstance.paused()).toBe(!before);
    expect(button.getAttribute('aria-pressed')).toBe(String(!before));
  });
});
