import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { PortraitScene } from './portrait-scene';

@Component({
  selector: 'app-about-portrait',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-portrait.component.html',
  styleUrl: './about-portrait.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPortraitComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewport', { static: true }) viewport!: ElementRef<HTMLDivElement>;
  loading = true;
  unavailable = false;
  paused = false;
  reducedMotion = false;
  private portrait?: PortraitScene;
  private intersection?: IntersectionObserver;
  private resize?: ResizeObserver;
  private motionPreference?: MediaQueryList;
  private visible = false;
  private destroyed = false;
  private frame?: number;
  private lastFrame = 0;
  private elapsed = 0;

  constructor(private readonly zone: NgZone, private readonly changeDetector: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.motionPreference.matches;
      this.motionPreference.addEventListener('change', this.onMotionPreference);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.resize = new ResizeObserver(() => {
        this.portrait?.resize();
        this.draw();
      });
      this.resize.observe(this.viewport.nativeElement);
      this.intersection = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
        this.ensurePortrait();
        this.updateAnimation();
      });
      this.intersection.observe(this.viewport.nativeElement);
    });
  }

  toggleAnimation(): void {
    this.paused = !this.paused;
    this.zone.runOutsideAngular(() => {
      this.draw();
      this.updateAnimation();
    });
  }

  private createPortrait(): PortraitScene {
    return new PortraitScene(this.viewport.nativeElement);
  }

  private async loadPortrait(): Promise<void> {
    try {
      this.portrait = this.createPortrait();
      await this.portrait.load();
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      });
      this.portrait.resize();
      this.draw();
      this.updateAnimation();
    } catch (error) {
      if (this.destroyed) return;
      this.portrait?.dispose();
      this.portrait = undefined;
      this.zone.run(() => {
        this.unavailable = true;
        this.loading = false;
        this.changeDetector.markForCheck();
      });
      console.warn('The original 3D portrait could not be displayed.', error);
    }
  }

  private readonly onMotionPreference = (event: MediaQueryListEvent): void => {
    this.zone.run(() => {
      this.reducedMotion = event.matches;
      this.changeDetector.markForCheck();
    });
    this.draw();
    this.updateAnimation();
  };

  private readonly onVisibilityChange = (): void => {
    this.ensurePortrait();
    this.updateAnimation();
  };

  private ensurePortrait(): void {
    if (this.visible && !document.hidden && !this.portrait && !this.unavailable && !this.destroyed) {
      void this.loadPortrait();
    }
  }

  private draw(): void {
    if (!this.loading && !this.destroyed && this.visible && !document.hidden) {
      this.portrait?.render(this.elapsed, this.reducedMotion || this.paused);
    }
  }

  private updateAnimation(): void {
    const animate = this.visible && !document.hidden && !this.loading &&
      !this.unavailable && !this.reducedMotion && !this.paused && !this.destroyed;
    if (!animate) {
      if (this.frame !== undefined) window.cancelAnimationFrame(this.frame);
      this.frame = undefined;
      this.lastFrame = 0;
      this.draw();
      return;
    }
    if (this.frame === undefined) this.frame = window.requestAnimationFrame(this.tick);
  }

  private readonly tick = (timestamp: number): void => {
    // Keep the 323k-vertex portrait at 30 fps, outside Angular change detection.
    if (!this.lastFrame || timestamp - this.lastFrame >= 1000 / 30) {
      if (this.lastFrame) this.elapsed += Math.min((timestamp - this.lastFrame) / 1000, 0.1);
      this.lastFrame = timestamp;
      this.draw();
    }
    this.frame = window.requestAnimationFrame(this.tick);
  };

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.frame !== undefined) window.cancelAnimationFrame(this.frame);
    this.intersection?.disconnect();
    this.resize?.disconnect();
    this.motionPreference?.removeEventListener('change', this.onMotionPreference);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.portrait?.dispose();
  }
}
