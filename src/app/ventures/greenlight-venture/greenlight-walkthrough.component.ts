import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';

type IdentityMode = 'managed' | 'company';
type Provider = 'Company SSO' | 'Okta' | 'Microsoft Entra' | 'Custom OIDC';

@Component({
  selector: 'app-greenlight-walkthrough',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './greenlight-walkthrough.component.html',
  styleUrls: ['./greenlight-walkthrough-scenes.css', './greenlight-walkthrough.component.css']
})
export class GreenlightWalkthroughComponent implements OnDestroy {
  @ViewChild('theater') private theater?: ElementRef<HTMLElement>;
  readonly chapters = [
    {
      label: 'Connect identity',
      title: 'Your people.\nYour permissions.',
      copy: 'Start with Greenlight-managed identity or bring the company login your team already knows.'
    },
    {
      label: 'Add the gate',
      title: 'A small change.\nA clear boundary.',
      copy: 'Add an approval step before a consequential action. Your application stays in control of execution.'
    },
    {
      label: 'Request an action',
      title: 'The agent asks.\nThe action waits.',
      copy: 'An agent prepares an invoice payment. Greenlight holds the request for the right people to review.'
    },
    {
      label: 'Human review',
      title: 'Context first.\nThen a decision.',
      copy: 'Review the amount, recipient, and reason. Only eligible people can approve, and the requester is excluded.'
    },
    {
      label: 'Continue safely',
      title: 'Approved to act.\nA record to keep.',
      copy: 'Your backend checks the approval, performs the operation, and keeps the decision linked to its outcome.'
    }
  ] as const;
  readonly providers: readonly Provider[] = ['Company SSO', 'Okta', 'Microsoft Entra', 'Custom OIDC'];
  mode: IdentityMode = 'company';
  provider: Provider = 'Company SSO';
  step = 0;
  approvals = 0;
  rejected = false;
  playing = false;
  private timer?: ReturnType<typeof setInterval>;

  get chapter() {
    return this.chapters[this.step];
  }
  get requiredApprovals() {
    return this.mode === 'company' ? 2 : 1;
  }
  get identityName() {
    return this.mode === 'managed' ? 'Greenlight' : this.provider;
  }
  get nextReviewer() {
    return this.approvals === 0 ? 'Maya Chen' : 'Alex Morgan';
  }

  chooseMode(mode: IdentityMode) {
    this.pause();
    this.mode = mode;
    this.reset();
  }

  chooseProvider(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (this.providers.includes(value as Provider)) {
      this.provider = value as Provider;
      this.pause();
      this.reset();
    }
  }

  play() {
    if (this.playing) {
      this.pause();
      return;
    }
    if (this.step === 4 || this.rejected) this.reset();
    this.playing = true;
    this.timer = setInterval(() => this.advance(), 3600);
  }

  playFocused() {
    this.play();
    this.theater?.nativeElement.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }

  pause() {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    this.playing = false;
  }

  selectChapter(step: number) {
    if (!Number.isInteger(step) || step < 0 || step >= this.chapters.length) return;
    this.pause();
    this.step = step;
    this.rejected = false;
    // Chapters are scenes in a product walkthrough, not live request state.
    this.approvals = step === 4 ? this.requiredApprovals : 0;
  }

  next() {
    this.pause();
    this.advance();
  }

  approve() {
    this.pause();
    if (this.step !== 3 || this.rejected) return;
    this.advance();
  }

  reject() {
    if (this.step !== 3 || this.rejected) return;
    this.pause();
    this.rejected = true;
  }

  replay() {
    this.pause();
    this.reset();
    this.play();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden) this.pause();
  }

  ngOnDestroy() {
    this.pause();
  }

  private reset() {
    this.step = 0;
    this.approvals = 0;
    this.rejected = false;
  }

  private advance() {
    if (this.rejected) {
      this.pause();
      return;
    }
    if (this.step === 3) {
      this.approvals += 1;
      if (this.approvals < this.requiredApprovals) return;
    }
    if (this.step < 4) this.step += 1;
    if (this.step === 4) this.pause();
  }
}
