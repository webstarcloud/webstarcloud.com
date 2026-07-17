import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthPanelComponent } from './auth-panel.component';
import { AuthService } from './auth.service';

describe('AuthPanelComponent', () => {
  let fixture: ComponentFixture<AuthPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AuthPanelComponent],
      imports: [CommonModule],
      providers: [{
        provide: AuthService,
        useValue: {
          state$: of({
            configured: true,
            loading: false,
            isAuthenticated: false,
            email: null,
            statusMessage: null,
            errorMessage: null
          })
        }
      }]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthPanelComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
  });

  it('shows the direct contact email without an invitation form', () => {
    const element = fixture.nativeElement as HTMLElement;
    const email = element.querySelector<HTMLAnchorElement>('.auth-email');

    expect(email?.textContent?.trim()).toBe('dwebster182@gmail.com');
    expect(email?.getAttribute('href')).toBe('mailto:dwebster182@gmail.com');
    expect(element.querySelector('form')).toBeNull();
  });
});
