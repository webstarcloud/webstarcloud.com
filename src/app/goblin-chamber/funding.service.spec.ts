import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FIRST_RUN, FUNDING_API, FundingService, FundingState, parseFunding } from './funding.service';

const snapshot = () => ({ campaignId: FIRST_RUN.id, targetMinor: 7200, currency: 'USD', receivedMinor: 1800, status: 'collecting', checkoutUrl: 'https://buy.stripe.com/test_example', updatedAt: new Date().toISOString() });
describe('FundingService', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: FUNDING_API, useValue: 'https://funding.example' }] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('makes no payment request when setup is missing', () => {
    TestBed.overrideProvider(FUNDING_API, { useValue: '' });
    let state: FundingState | undefined;
    TestBed.inject(FundingService).state$.subscribe(value => state = value);
    expect(state).toEqual({ kind: 'setup' });
  });
  it('polls verified totals, hides failed balances and recovers; stops on unsubscribe', fakeAsync(() => {
    const http = TestBed.inject(HttpTestingController); let state: FundingState | undefined;
    const subscription = TestBed.inject(FundingService).state$.subscribe(value => state = value);
    tick(0); http.expectOne('https://funding.example/funding').flush(snapshot());
    expect(state?.kind).toBe('ready');
    tick(30_000); http.expectOne('https://funding.example/funding').flush('', { status: 503, statusText: 'Unavailable' });
    expect(state?.kind).toBe('unavailable');
    tick(30_000); http.expectOne('https://funding.example/funding').flush(snapshot());
    expect(state?.kind).toBe('ready'); subscription.unsubscribe();
    tick(30_000); http.expectNone('https://funding.example/funding');
  }));
  it('rejects negative, fractional, mismatched, stale or unsafe funding responses', () => {
    for (const change of [{receivedMinor:-1}, {receivedMinor:1.5}, {currency:'EUR'}, {targetMinor:1}, {campaignId:'other'}, {status:'magic'}, {updatedAt:'2020-01-01'}, {checkoutUrl:'javascript:alert(1)'}, {checkoutUrl:'https://buy.stripe.com.attacker.example/pay'}]) {
      expect(() => parseFunding({ ...snapshot(), ...change })).toThrow();
    }
    expect(parseFunding({ ...snapshot(), receivedMinor:7500, status:'funded', checkoutUrl:null }).receivedMinor).toBe(7500);
  });
});
