import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { StageMode } from './particles/particles.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  readonly title = 'David Webster | AI Systems Builder';
  authPanelOpen = false;
  responseOpen = false;
  stageMode: StageMode = 'home';
  private readonly routerSubscription: Subscription;

  constructor(private readonly router: Router) {
    this.stageMode = this.getStageMode(this.router.url);
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.stageMode = this.getStageMode(event.urlAfterRedirects);
        this.responseOpen = false;
      });
  }

  get isHomeStage() {
    return this.stageMode === 'home';
  }

  openAuthPanel() {
    this.authPanelOpen = true;
  }

  closeAuthPanel() {
    this.authPanelOpen = false;
  }

  setResponseOpen(open: boolean) {
    this.responseOpen = open;
  }

  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
  }

  private getStageMode(url: string): StageMode {
    const path = url.split('?')[0].split('#')[0];

    if (
      path.startsWith('/ventures/anchorkeep') ||
      path.startsWith('/anchorkeep') ||
      path.startsWith('/ventures/safegit') ||
      path.startsWith('/safegit')
    ) {
      return 'anchorkeep';
    }

    if (path.startsWith('/greenlight') || path.startsWith('/ventures/greenlight')) {
      return 'greenlight';
    }

    if (path.startsWith('/ventures')) {
      return 'ventures';
    }

    if (path.startsWith('/labs/')) {
      return 'lab-detail';
    }

    if (path.startsWith('/labs')) {
      return 'labs';
    }

    return 'home';
  }

}
