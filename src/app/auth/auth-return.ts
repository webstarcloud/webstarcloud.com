const POST_LOGIN_ROUTE_KEY = 'webstarcloud.postLoginRoute';

export function normalizePostLoginRoute(path: string | null | undefined): string {
  if (!path || /^https?:\/\//i.test(path)) {
    return '/';
  }

  const withoutQueryOnly = path.startsWith('?') ? `/${path}` : path;
  const normalized = withoutQueryOnly.startsWith('/') ? withoutQueryOnly : `/${withoutQueryOnly}`;

  return normalized.startsWith('//') ? '/' : normalized;
}

export function storePostLoginRoute(path: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(POST_LOGIN_ROUTE_KEY, normalizePostLoginRoute(path));
}

export function readPostLoginRoute(fallback = '/') {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return normalizePostLoginRoute(window.sessionStorage.getItem(POST_LOGIN_ROUTE_KEY) || fallback);
}
