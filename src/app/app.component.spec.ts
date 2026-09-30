import { NgZone, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { GoblinChamberComponent } from './goblin-chamber/goblin-chamber.component';
import { appRoutes } from './app-routing.module';
import { AuthService } from './auth/auth.service';
import { of } from 'rxjs';

describe('AppComponent', () => {
  const navigate = (url: string): Promise<boolean> => TestBed.inject(NgZone)
    .run(() => TestBed.inject(Router).navigateByUrl(url));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes(appRoutes),
        HttpClientTestingModule
      ],
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: AuthService, useValue: {
        snapshot: { isAuthenticated: false, loading: false },
        state$: of({ isAuthenticated: false, loading: false }), getAccessToken: async () => '',
      } }],
    }).overrideComponent(GoblinChamberComponent, { set: { template: '', imports: [] } }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should expose the lab site title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('David Webster | Intelligence research');
  });

  it('uses the restored personal branding on secondary pages', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    await navigate('/about'); fixture.detectChanges();
    const brand = compiled.querySelector('.stage-brand');
    expect(brand?.textContent).toContain('David Webster');
    expect(brand?.textContent).not.toContain('WebstarCloud');
    expect(brand?.querySelector('.stage-brand__mark')).not.toBeNull();
  });

  it('redirects the former profile to the merged About experience and preserves the selected CV', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await navigate('/profile');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(TestBed.inject(Router).url).toBe('/about#experience');
    expect(compiled.querySelector('app-about-page')).not.toBeNull();
    const experience = compiled.querySelector('#experience');
    expect(experience?.textContent).toContain('Building agentic AI platforms and unified control planes');
    const highlights = experience?.querySelector('.career-grid');
    expect(highlights?.textContent).toContain('TMNL');
    expect(highlights?.textContent).toContain('LeasePlan');
    expect(highlights?.textContent).toContain('InvestSure');
    expect(highlights?.textContent).toContain('$1.5M');
    expect(experience?.querySelector('.current-work')?.textContent).toContain('Backbase');
    expect(experience?.querySelector('.career-details')).not.toBeNull();
    expect(compiled.textContent).not.toContain('Customers served');
    expect(compiled.textContent).not.toContain('Billions');
    expect(compiled.querySelector<HTMLAnchorElement>('a[download="David-Webster.pdf"]')?.getAttribute('href'))
      .toBe('/assets/David-Webster.pdf');
    expect(compiled.querySelector<HTMLAnchorElement>('a[href="mailto:dwebster182@gmail.com"]'))
      .not.toBeNull();
    expect(compiled.querySelector('app-goblin-chamber')).not.toBeNull();
    expect(compiled.querySelector('app-particles')).toBeNull();
    expect(compiled.querySelector('.professional-hero')).toBeNull();
    expect(compiled.querySelector('.brain-context')).toBeNull();
  });

  it('keeps the About experience link on the same page with its career anchor', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await navigate('/about');
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLAnchorElement>('.about-links a[href="/about#experience"]');

    expect(link).not.toBeNull();
    link!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/about#experience');
    expect(fixture.nativeElement.querySelector('#experience h2')).not.toBeNull();
  });

  it('redirects former indexes to the lab without mounting the chat stage', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;

    for (const oldPath of ['/ventures', '/labs', '/projects']) {
      await navigate('/about');
      await navigate(oldPath);
      fixture.detectChanges();

      expect(router.url).toBe('/');
      expect(compiled.querySelector('app-goblin-home')).not.toBeNull();
      expect(compiled.querySelector('.stage-avatar')).toBeNull();
      expect(compiled.querySelector('.professional-hero')).toBeNull();
    }
  });

  it('keeps the shared inspector URL working without a paused-project label', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await navigate('/labs/llm-input-hardening');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#inspection-input')).not.toBeNull();
    expect(compiled.querySelector('.paused-notice')).toBeNull();
    expect(fixture.componentInstance.stageMode).toBe('lab-detail');
  });

  it('preserves legacy demo redirects and labels the work paused', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    for (const [oldPath, destination] of [
      ['/ventures/safegit', '/ventures/anchorkeep'],
      ['/ventures/greenlight', '/greenlight']
    ]) {
      await navigate(oldPath);
      fixture.detectChanges();
      expect(router.url).toBe(destination);
      expect((fixture.nativeElement as HTMLElement).querySelector('.paused-notice')?.textContent)
        .toContain('Paused project');
    }
  });


  it('opens every notebook section without mounting the career or chat stage', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    for (const section of ['runs', 'roadmap', 'architecture', 'research', 'funding']) {
      await navigate('/notebook/' + section);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const page = fixture.nativeElement as HTMLElement;
      expect(page.querySelector('app-lab-notebook h1')).not.toBeNull();
      expect(page.querySelector('.stage-avatar')).toBeNull();
      expect(page.querySelector('.professional-hero')).toBeNull();
      if(section !== 'funding') {
        const canonical = '/research/' + (section === 'research' ? 'questions' : section);
        expect(TestBed.inject(Router).url).toBe(canonical);
        expect(page.querySelector('.notebook-nav [aria-current=page]')?.getAttribute('href')).toBe(canonical);
      }
    }
  });

  it('places support on About and articles on Research', async () => {
    const fixture = TestBed.createComponent(AppComponent);fixture.detectChanges();
    await navigate('/about');fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-goblin-chamber')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.stage-avatar')).toBeNull();
    await navigate('/research');fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.architecture-entry')?.getAttribute('href')).toBe('/research/architecture');
    expect(fixture.nativeElement.querySelectorAll('.article-row').length).toBe(7);
    expect(fixture.nativeElement.querySelector('app-goblin-chamber')).toBeNull();
  });

  it('opens each assistant layer from its research article link', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await navigate('/research');
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.article-row'));
    const destinations = links.map(link => link.getAttribute('href')!);

    for (const destination of destinations) {
      await navigate(destination);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(TestBed.inject(Router).url).withContext(destination).toBe(destination);
      expect(fixture.nativeElement.querySelector('app-lab-notebook h1')).withContext(destination).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.article-index')).withContext(destination).toBeNull();
    }
  });

  it('tracks whether the answer workspace is open', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.setResponseOpen(true);

    expect(app.responseOpen).toBeTrue();
  });
});
