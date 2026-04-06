import { Component } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  authPanelOpen = false;
  readonly authState$ = this.auth.state$;

  constructor(public auth: AuthService) {}

  toggleAuthPanel() {
    this.authPanelOpen = !this.authPanelOpen;
  }

  closeAuthPanel() {
    this.authPanelOpen = false;
  }
}
