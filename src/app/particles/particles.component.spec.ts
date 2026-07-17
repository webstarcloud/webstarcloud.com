import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ParticlesComponent } from './particles.component';
import { AuthService } from '../auth/auth.service';

describe('ParticlesComponent', () => {
  let component: ParticlesComponent;
  let fixture: ComponentFixture<ParticlesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParticlesComponent ],
      imports: [HttpClientTestingModule],
      providers: [
        {
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
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticlesComponent);
    component = fixture.componentInstance;
  });

  it('renders the lightweight ASCII portrait without a canvas', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.ascii-art')?.textContent).toBe(component.asciiPortrait);
    expect(component.asciiPortrait.split('\n')).toHaveSize(40);
    expect(element.querySelector('canvas')).toBeNull();
  });
});
