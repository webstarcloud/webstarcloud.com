import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { AboutPortraitComponent } from './about-portrait.component';
import { PortraitScene } from './portrait-scene';

describe('About portrait', () => {
  let fixture: ComponentFixture<AboutPortraitComponent>;
  let intersection: IntersectionObserverCallback;
  let observer: jasmine.SpyObj<IntersectionObserver>;
  let resize: jasmine.SpyObj<ResizeObserver>;
  let portrait: jasmine.SpyObj<PortraitScene>;
  let motion: MediaQueryList;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AboutPortraitComponent] }).compileComponents();
    observer = jasmine.createSpyObj('IntersectionObserver', ['observe', 'disconnect']);
    resize = jasmine.createSpyObj('ResizeObserver', ['observe', 'disconnect']);
    portrait = jasmine.createSpyObj('PortraitScene', ['load', 'resize', 'render', 'dispose']);
    portrait.load.and.returnValue(Promise.resolve());
    motion = {
      matches: false,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
    } as unknown as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(motion);
    spyOn(window, 'IntersectionObserver').and.callFake((function(callback: IntersectionObserverCallback) {
      intersection = callback;
      return observer;
    }) as any);
    spyOn(window, 'ResizeObserver').and.callFake((function() { return resize; }) as any);
    spyOn(window, 'requestAnimationFrame').and.returnValue(42);
    spyOn(window, 'cancelAnimationFrame');
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    fixture = TestBed.createComponent(AboutPortraitComponent);
    spyOn(fixture.componentInstance as any, 'createPortrait').and.returnValue(portrait);
  });

  afterEach(() => fixture.destroy());

  function setVisible(visible: boolean): void {
    intersection([{ isIntersecting: visible } as IntersectionObserverEntry], observer);
  }

  it('loads only when visible, pauses offscreen and releases resources on navigation', fakeAsync(() => {
    fixture.detectChanges();
    expect(portrait.load).not.toHaveBeenCalled();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    setVisible(true);
    flushMicrotasks();
    fixture.detectChanges();
    expect(portrait.load).toHaveBeenCalledTimes(1);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.portrait-control')?.textContent).toContain('Pause animation');

    setVisible(false);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
    setVisible(true);
    expect(portrait.load).toHaveBeenCalledTimes(1);

    fixture.destroy();
    expect(portrait.dispose).toHaveBeenCalledTimes(1);
    expect(observer.disconnect).toHaveBeenCalled();
    expect(resize.disconnect).toHaveBeenCalled();
    expect(motion.removeEventListener).toHaveBeenCalled();
  }));

  it('renders a still portrait with no animation loop when reduced motion is requested', fakeAsync(() => {
    Object.defineProperty(motion, 'matches', { value: true });
    fixture.detectChanges();
    setVisible(true);
    flushMicrotasks();
    fixture.detectChanges();

    expect(portrait.render).toHaveBeenCalledWith(0, true);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.portrait-control')).toBeNull();
  }));

  it('lets visitors pause the portrait without losing it', fakeAsync(() => {
    fixture.detectChanges();
    setVisible(true);
    flushMicrotasks();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.portrait-control') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(portrait.render).toHaveBeenCalledWith(0, true);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('Resume animation');
    expect(portrait.dispose).not.toHaveBeenCalled();
  }));

  it('shows an accessible fallback when the asset cannot load', fakeAsync(() => {
    portrait.load.and.callFake(() => Promise.reject(new Error('Asset unavailable')));
    const warning = spyOn(console, 'warn');
    fixture.detectChanges();
    setVisible(true);
    flushMicrotasks();
    fixture.detectChanges();

    expect(portrait.dispose).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.portrait-status')?.textContent).toContain('unavailable on this device');
    expect(fixture.nativeElement.querySelector('[aria-busy="false"]')).not.toBeNull();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  }));
});
