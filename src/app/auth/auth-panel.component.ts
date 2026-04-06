import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  constructor(public auth: AuthService) {}

  closePanel() {
    this.closed.emit();
  }

  submitCredentials() {
    this.auth.signIn();
  }

  signOut() {
    this.auth.signOut();
  }
}
