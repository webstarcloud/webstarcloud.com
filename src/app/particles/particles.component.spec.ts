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

  it('creates when WebGL is unavailable', () => {
    spyOn(component as any, 'createRenderer').and.throwError('WebGL unavailable');
    const warning = spyOn(console, 'warn');

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(warning).toHaveBeenCalled();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.renderer-container')).not.toBeNull();
    expect(element.querySelector('video, .ascii-avatar')).toBeNull();
  });
});
