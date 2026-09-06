import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should expose the professional site title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('David Webster | Building agentic AI platforms and unified control planes');
  });

  it('should render the stage shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const brand = compiled.querySelector('.stage-brand');
    expect(brand?.textContent).toContain('David Webster');
    expect(brand?.textContent).not.toContain('WebstarCloud');
    expect(brand?.querySelector('.stage-brand__mark')).not.toBeNull();
  });

  it('renders the recruiter-focused proposition and actions on the home stage', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe(
      'Building agentic AI platforms and unified control planes'
    );
    expect(compiled.querySelector('.professional-proof')?.textContent).toContain('TMNL');
    expect(compiled.querySelector('.professional-proof')?.textContent).toContain('LeasePlan');
    expect(compiled.querySelector('.professional-proof')?.textContent).toContain('InvestSure');
    expect(compiled.querySelector('.professional-proof')?.textContent).toContain('$1.5M');
    expect(compiled.textContent).not.toContain('Customers served');
    expect(compiled.textContent).not.toContain('Billions');
    expect(compiled.querySelector<HTMLAnchorElement>('a[download="David-Webster.pdf"]')?.getAttribute('href'))
      .toBe('/assets/David-Webster.pdf');
    expect(compiled.querySelector<HTMLAnchorElement>('a[href="mailto:dwebster182@gmail.com"]'))
      .not.toBeNull();
  });

  it('tracks whether the answer workspace is open', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.setResponseOpen(true);

    expect(app.responseOpen).toBeTrue();
  });
});
