import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      imports: [RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('leads with the shipped input-boundary package', () => {
    expect(component.selectedWork[0]).toEqual(jasmine.objectContaining({
      name: 'llm-input-hardening',
      route: '/labs/llm-input-hardening',
      tone: 'public'
    }));

    expect(component.selectedWork[1]).toEqual(jasmine.objectContaining({
      name: 'Agent API Hardening / Blacksmith',
      type: 'Agent infrastructure · Working preview',
      tone: 'lead'
    }));
  });

  it('presents the documented TMNL outcome precisely', () => {
    const tmnl = component.platforms.find((platform) => platform.name === 'TMNL');

    expect(tmnl).toEqual(jasmine.objectContaining({
      name: 'TMNL',
      kind: 'Production',
      blurb: jasmine.stringContaining('five Dutch banks'),
      metric: '$1.5M documented savings'
    }));
  });

  it('uses verified production outcomes without implying customer reach', () => {
    const backbase = component.platforms.find((platform) => platform.name === 'Backbase');
    const absa = component.platforms.find((platform) => platform.name === 'Absa — ML Brand Audit');
    const standardBank = component.platforms.find((platform) => platform.name === 'Standard Bank');
    const allCopy = component.platforms
      .flatMap((platform) => [platform.name, platform.context, platform.blurb, platform.metric])
      .join(' ');

    expect(backbase).toEqual(jasmine.objectContaining({
      metric: 'One agentic use case live',
      blurb: jasmine.stringContaining('control and data planes')
    }));
    expect(absa?.metric).toBe('5,000 records/30 min · 40,000 artefacts/300 systems');
    expect(standardBank?.blurb).toContain('for a bank with more than 19 million customers');
    expect(allCopy).not.toContain('customers served');
    expect(allCopy).not.toContain('Billions');
    expect(allCopy).not.toContain('12 countries');
  });

  it('labels exploratory GPU and model work as R&D', () => {
    const research = component.platforms.find((platform) => platform.kind === 'R&D');

    expect(research).toEqual(jasmine.objectContaining({
      name: 'GPU & model systems',
      blurb: jasmine.stringContaining('AWS P5/H100'),
      metric: 'R&D · not presented as production'
    }));
    expect(research?.blurb).toContain('autoencoders');
    expect(research?.blurb).toContain('deepfakes');
  });
});
