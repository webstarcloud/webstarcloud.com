import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-panel',
  templateUrl: './auth-panel.component.html',
  styleUrls: ['./auth-panel.component.css']
})
export class AuthPanelComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly authState$ = this.auth.state$;

  readonly ownerEmail = 'dwebster182@gmail.com';

  requesterName = '';
  requesterEmail = '';
  requesterNote = '';
  requestSent = false;

  constructor(public auth: AuthService) {}

  closePanel() {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape() {
    if (this.open) {
      this.closePanel();
    }
  }

  requestAccess() {
    const name = this.requesterName.trim();
    const email = this.requesterEmail.trim();
    if (!name || !email) {
      return;
    }

    const note = this.requesterNote.trim();
    const subject = `WebstarCloud access request — ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      note || '(no note)'
    ].join('\n');

    const mailto = `mailto:${this.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (typeof window !== 'undefined') {
      window.location.href = mailto;
    }

    this.requestSent = true;
  }

  signIn() {
    this.auth.signIn('/');
  }

  signOut() {
    this.auth.signOut();
  }
}
