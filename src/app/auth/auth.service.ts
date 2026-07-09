import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { environment } from '../../environments/environment';
import { storePostLoginRoute } from './auth-return';

export interface AuthState {
  configured: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  email: string | null;
  statusMessage: string | null;
  errorMessage: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stateSubject = new BehaviorSubject<AuthState>({
    configured: false,
    loading: false,
    isAuthenticated: false,
    email: null,
    statusMessage: null,
    errorMessage: null
  });

  readonly state$ = this.stateSubject.asObservable();
  private readonly authConfig = environment.auth;

  constructor(private oidcSecurityService: OidcSecurityService) {
    if (!this.isConfigured()) {
      this.setState({
        configured: false,
        statusMessage: 'Login wiring is ready. Add OIDC settings in the environment files to turn it on.'
      });
      return;
    }

    this.setState({ configured: true });
    this.watchAuthState();
    this.checkAuth();
  }

  get snapshot() {
    return this.stateSubject.value;
  }

  signIn(returnPath = '/') {
    if (!this.isConfigured()) {
      this.setState({
        configured: false,
        loading: false,
        errorMessage: 'Auth is not configured yet.',
        statusMessage: 'Add OIDC settings in the environment files first.'
      });
      return;
    }

    storePostLoginRoute(returnPath);

    this.setState({
      loading: true,
      errorMessage: null,
      statusMessage: this.authConfig.identityProvider
        ? `Redirecting to ${this.authConfig.identityProvider}...`
        : 'Redirecting to login...'
    });

    const customParams = this.authConfig.identityProvider
      ? { identity_provider: this.authConfig.identityProvider }
      : undefined;

    this.oidcSecurityService.authorize(undefined, { customParams });
  }

  signOut() {
    if (!this.isConfigured()) {
      return;
    }

    this.setState({
      loading: true,
      errorMessage: null,
      statusMessage: 'Signing out...'
    });

    try {
      this.oidcSecurityService.logoffLocal();
      this.setState({
        configured: true,
        loading: false,
        isAuthenticated: false,
        email: null,
        statusMessage: null,
        errorMessage: null
      });

      if (typeof window !== 'undefined') {
        window.location.assign(this.buildCognitoLogoutUrl());
      }
    } catch (error) {
      console.error('OIDC logoff failed.', error);
      this.setState({
        loading: false,
        errorMessage: this.getErrorMessage(error),
        statusMessage: null
      });
    }
  }

  private buildCognitoLogoutUrl() {
    const logoutUrl = new URL('/logout', this.authConfig.hostedUiDomain);
    logoutUrl.searchParams.set('client_id', this.authConfig.clientId);
    logoutUrl.searchParams.set('logout_uri', this.buildPostLogoutRedirectUrl());
    return logoutUrl.toString();
  }

  private buildPostLogoutRedirectUrl() {
    const fallbackOrigin = 'https://webstarcloud.com';
    const origin = typeof window === 'undefined' ? fallbackOrigin : window.location.origin;
    const path = this.authConfig.postLogoutRedirectPath;

    if (!path || path === '/') {
      return origin;
    }

    if (/^https?:\/\//.test(path)) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${normalizedPath}`;
  }

  private watchAuthState() {
    this.oidcSecurityService.isAuthenticated$.subscribe(({ isAuthenticated }) => {
      this.setState({
        configured: true,
        loading: false,
        isAuthenticated,
        statusMessage: isAuthenticated ? 'Signed in.' : null,
        errorMessage: null
      });
    });

    this.oidcSecurityService.userData$.subscribe(({ userData }) => {
      const email = typeof userData?.email === 'string' ? userData.email : null;
      this.setState({ email });
    });
  }

  private checkAuth() {
    this.setState({
      configured: true,
      loading: true,
      errorMessage: null,
      statusMessage: 'Checking session...'
    });

    this.oidcSecurityService.checkAuth().subscribe({
      next: (response) => {
        this.setState({
          configured: true,
          loading: false,
          isAuthenticated: response.isAuthenticated,
          email: typeof response.userData?.email === 'string' ? response.userData.email : null,
          statusMessage: response.isAuthenticated ? 'Signed in.' : null,
          errorMessage: response.errorMessage ?? null
        });
      },
      error: (error) => {
        console.error('OIDC checkAuth failed.', error);
        this.setState({
          configured: true,
          loading: false,
          isAuthenticated: false,
          email: null,
          statusMessage: null,
          errorMessage: this.getErrorMessage(error)
        });
      }
    });
  }

  private isConfigured() {
    return Boolean(
      this.authConfig.enabled &&
      this.authConfig.authority.trim() &&
      this.authConfig.hostedUiDomain.trim() &&
      this.authConfig.clientId.trim()
    );
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Authentication failed.';
  }

  private setState(partialState: Partial<AuthState>) {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partialState
    });
  }
}
