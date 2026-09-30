import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AuthService, AuthState } from '../auth/auth.service';
import { ChatStore } from './chat-store.service';
import { ExperimentPreferencesService } from './experiment-preferences.service';

describe('Experimental feature acknowledgement', () => {
  let account: BehaviorSubject<AuthState>;
  let preferences: ExperimentPreferencesService;
  let chats: ChatStore;
  beforeEach(() => {
    account = new BehaviorSubject<AuthState>({ configured: true, loading: false, isAuthenticated: true,
      email: 'same@example.com', subject: 'account-one', statusMessage: null, errorMessage: null });
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: {
      state$: account.asObservable(), get snapshot() { return account.value; },
    } }] });
    preferences = TestBed.inject(ExperimentPreferencesService);
    chats = TestBed.inject(ChatStore);
  });
  it('enables all three features only after an authenticated acknowledgement', () => {
    expect(preferences.state()).toEqual({ acknowledged: false, memory: false, sandbox: false, recording: false });
    preferences.set('memory', true);
    expect(preferences.state().memory).toBeFalse();
    preferences.acknowledge(true);
    expect(preferences.state()).toEqual({ acknowledged: true, memory: true, sandbox: true, recording: true });
    preferences.set('recording', false);
    expect(preferences.state()).toEqual({ acknowledged: true, memory: true, sandbox: true, recording: false });
  });
  it('supports continuing with every optional feature off', () => {
    preferences.acknowledge(false);
    expect(preferences.state()).toEqual({ acknowledged: true, memory: false, sandbox: false, recording: false });
    preferences.set('sandbox', true);
    expect(preferences.state().sandbox).toBeTrue();
  });
  it('cannot acknowledge while anonymous, checking authentication or missing a subject', () => {
    for (const partial of [{ isAuthenticated: false, subject: null }, { loading: true }, { subject: null }]) {
      account.next({ ...account.value, loading: false, isAuthenticated: true, subject: 'account-one', ...partial });
      preferences.acknowledge(true);
      expect(preferences.state().acknowledged).toBeFalse();
    }
  });
  it('preserves choices during a temporary session check, while preventing changes', () => {
    preferences.acknowledge(true);
    account.next({ ...account.value, loading: true });
    preferences.set('recording', false);
    expect(preferences.state().recording).toBeTrue();
    account.next({ ...account.value, loading: false });
    expect(preferences.state().acknowledged).toBeTrue();
  });
  it('clears consent and temporary conversations for a different subject even with the same email', () => {
    preferences.acknowledge(true);
    chats.newSession('gobwen-think');
    account.next({ ...account.value, subject: 'account-two' });
    expect(preferences.state().acknowledged).toBeFalse();
    expect(preferences.state().recording).toBeFalse();
    expect(chats.sessions()).toEqual([]);
    expect(chats.activeId()).toBeNull();
  });
  it('requires a fresh choice after sign-out and return to the same account', () => {
    preferences.acknowledge(true);
    chats.newSession('gobwen-think');
    account.next({ ...account.value, isAuthenticated: false, subject: null });
    expect(preferences.state().acknowledged).toBeFalse();
    expect(chats.sessions()).toEqual([]);
    account.next({ ...account.value, isAuthenticated: true, subject: 'account-one' });
    expect(preferences.state().acknowledged).toBeFalse();
  });
});
