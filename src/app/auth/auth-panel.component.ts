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

  signIn() {
    this.auth.signIn('/');
  }

  signOut() {
    this.auth.signOut();
  }
}
