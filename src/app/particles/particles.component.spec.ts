import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
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
    expect(element.querySelector('.ascii-art--front')?.textContent).toBe(component.activeAsciiPortrait);
    expect(element.querySelector('.ascii-art--back')?.textContent).toBe(component.asciiFrames[0]);
    expect(element.querySelector('.ascii-art--middle')?.textContent).toBe(component.asciiFrames[0]);
    expect(component.activeAsciiPortrait.split('\n')).toHaveSize(55);
    expect(component.asciiFrames).toHaveSize(2);
    expect(new Set(component.asciiFrames).size).toBe(2);
    const blinkDifference = [...component.asciiFrames[0]].filter((character, index) => {
      return character !== component.asciiFrames[1][index];
    });
    expect(blinkDifference.length).toBeLessThanOrEqual(10);
    expect(element.querySelectorAll('.ascii-art')).toHaveSize(3);
    expect(element.querySelector('canvas')).toBeNull();
  });

  it('advances through distinct portrait frames', fakeAsync(() => {
    fixture.detectChanges();
    const initialFrame = component.activeAsciiPortrait;

    tick(2_160);
    fixture.detectChanges();

    expect(component.activeAsciiPortrait).not.toBe(initialFrame);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.ascii-art--front')?.textContent).toBe(component.activeAsciiPortrait);
    expect(element.querySelector('.ascii-art--back')?.textContent).toBe(component.asciiFrames[0]);
    expect(element.querySelector('.ascii-art--middle')?.textContent).toBe(component.asciiFrames[0]);
    fixture.destroy();
  }));
});
