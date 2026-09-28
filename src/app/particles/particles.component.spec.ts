import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ParticlesComponent } from './particles.component';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

describe('ParticlesComponent', () => {
  let component: ParticlesComponent;
  let fixture: ComponentFixture<ParticlesComponent>;
  let http: HttpTestingController;

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
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); fixture.destroy(); });

  const blocked = {
    error: 'Potentially unsafe input detected.', code: 'INPUT_BLOCKED', blocked: true,
    hardening: { enabled: true, changed: false, blocked: true, model_called: false,
      library_version: '3.0.0', policy: 'strict_exec', action: 'quarantine',
      reason_codes: ['IH033_ENCODED_RISKY_UNICODE'] }
  };

  it('shows a server blocking receipt without consuming the public answer', () => {
    const consume = spyOn(component as any, 'markAnonymousResponseUsed');
    component.getData('abc&#x202E;def');
    const request = http.expectOne(environment.api.baseUrl);
    expect(request.request.body).toEqual({ question: 'abc&#x202E;def' });
    request.flush(JSON.stringify(blocked), { status: 400, statusText: 'Bad Request' });
    expect(component.hardeningReceipt?.blocked).toBeTrue();
    expect(component.hardeningReceipt?.model_called).toBeFalse();
    expect(component.activeResponseMarkdown).toContain('blocked');
    expect(consume).not.toHaveBeenCalled();
  });

  it('runs a fixed attack example even when the model preview is used', () => {
    component.gateLocked = true;
    const consume = spyOn(component as any, 'markAnonymousResponseUsed');
    component.tryAttack('encoded_bidi');
    const request = http.expectOne(environment.api.inspectionUrl);
    expect(request.request.body).toEqual({ operation: 'attack_demo', sample: 'encoded_bidi' });
    request.flush(JSON.stringify(blocked), { status: 400, statusText: 'Bad Request' });
    expect(component.hardeningReceipt?.reason_codes).toContain('IH033_ENCODED_RISKY_UNICODE');
    expect(consume).not.toHaveBeenCalled();
  });

  it('keeps normal chat gated after the public answer is used', () => {
    component.gateLocked = true;
    component.question = 'Hello';
    component.askQuestion();
    http.expectNone(environment.api.baseUrl);
  });

  it('shows that the model was called for an allowed answer', () => {
    const consume = spyOn(component as any, 'markAnonymousResponseUsed');
    component.getData('Hello');
    http.expectOne(environment.api.baseUrl).flush(JSON.stringify({ answer: 'Hi',
      hardening: { enabled: true, blocked: false, model_called: true, reason_codes: [] } }));
    expect(component.hardeningReceipt?.model_called).toBeTrue();
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it('does not retain a prior receipt or consume an answer on network failure', () => {
    const consume = spyOn(component as any, 'markAnonymousResponseUsed');
    component.getData('Hello');
    http.expectOne(environment.api.baseUrl).flush('Unavailable', { status: 502, statusText: 'Bad Gateway' });
    expect(component.hardeningReceipt).toBeUndefined();
    expect(consume).not.toHaveBeenCalled();
    expect(component.isDisabled).toBeFalse();
  });

  it('does not call the chat model in specimen mode', () => {
    component.displayMode = 'specimen';
    component.getData('Hello');
    http.expectNone(environment.api.baseUrl);
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
