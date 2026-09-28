import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InputHardeningService, InspectionResult, visibleCharacters } from './input-hardening.service';
import { LlmInputLabComponent } from './llm-input-lab.component';

const encodedResult: InspectionResult = {
  operation: 'inspect', library: { name: 'llm-input-hardening', version: '3.0.0' },
  clean: 'abc&#x202E;def',
  report: {
    report_version: 1, policy: 'balanced_chat', normalization: 'NFC', changed: false,
    removed_counts: {}, flagged_counts: { encoded_risky_unicode: 1 },
    reason_codes: { IH033_ENCODED_RISKY_UNICODE: 1 }, spans: [], stats: {}
  },
  decision: { action: 'quarantine', reason_codes: ['IH033_ENCODED_RISKY_UNICODE'] }
};

describe('InputHardeningService', () => {
  let service: InputHardeningService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(InputHardeningService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends the original text and selected policy to the inspection operation', () => {
    let response: InspectionResult | undefined;
    service.inspect('abc&#x202E;def', 'balanced_chat').subscribe(result => response = result);
    const request = http.expectOne(environment.api.inspectionUrl);
    expect(request.request.body).toEqual({ operation: 'inspect', text: 'abc&#x202E;def', policy: 'balanced_chat' });
    expect(request.request.method).toBe('POST');
    request.flush(encodedResult);
    expect(response?.clean).toBe('abc&#x202E;def');
    expect(response?.decision.action).toBe('quarantine');
  });

  it('rejects a legacy chat response rather than showing an invented report', () => {
    const onError = jasmine.createSpy('error');
    service.inspect('x', 'strict_exec').subscribe({ error: onError });
    http.expectOne(environment.api.inspectionUrl).flush({ answer: 'hello' });
    expect(onError).toHaveBeenCalled();
  });

  it('bounds the wait when the backend does not respond', fakeAsync(() => {
    const onError = jasmine.createSpy('error');
    service.inspect('x', 'balanced_chat').subscribe({ error: onError });
    const request = http.expectOne(environment.api.inspectionUrl);
    tick(15000);
    expect(onError).toHaveBeenCalled();
    expect(request.cancelled).toBeTrue();
  }));

  it('reveals controls without interpreting HTML or modifying ordinary text', () => {
    expect(visibleCharacters('a\u202Eb\u200B\n')).toBe('a\\u{202E}b\\u{200B}\n');
    expect(visibleCharacters('<b>&#x202E;</b> café')).toBe('<b>&#x202E;</b> café');
  });
});

describe('LlmInputLabComponent', () => {
  let results: Subject<InspectionResult>;
  let service: jasmine.SpyObj<InputHardeningService>;
  let component: LlmInputLabComponent;
  beforeEach(() => {
    results = new Subject<InspectionResult>();
    service = jasmine.createSpyObj('InputHardeningService', ['inspect']);
    service.inspect.and.returnValue(results);
    component = new LlmInputLabComponent(service);
  });
  afterEach(() => component.ngOnDestroy());

  it('keeps the real decision even when sanitization left the text unchanged', () => {
    component.inspect();
    results.next(encodedResult);
    expect(component.result?.report.changed).toBeFalse();
    expect(component.result?.decision.action).toBe('quarantine');
    expect(component.signals[0].code).toBe('IH033_ENCODED_RISKY_UNICODE');
  });

  it('discards a pending response when the text changes', () => {
    component.inspect();
    component.updateInput('new input');
    results.next(encodedResult);
    expect(component.result).toBeUndefined();
    expect(component.loading).toBeFalse();
  });

  it('clears the previous decision when the policy changes', () => {
    component.inspect();
    results.next(encodedResult);
    component.setPolicy('strict_exec');
    expect(component.result).toBeUndefined();
  });

  it('does not send over-limit text and counts emoji as Unicode characters', () => {
    component.updateInput('😀'.repeat(2001));
    component.inspect();
    expect(component.characterCount).toBe(2001);
    expect(service.inspect).not.toHaveBeenCalled();
    expect(component.error).toContain('2000');
  });

  it('shows failure instead of retaining a successful result', () => {
    component.inspect();
    results.error(new Error('offline'));
    expect(component.error).toContain('unavailable');
    expect(component.result).toBeUndefined();
    expect(component.loading).toBeFalse();
  });
});
