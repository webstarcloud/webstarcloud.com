import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);

  return auth.state$.pipe(
    filter((authState) => !authState.loading),
    take(1),
    map((authState) => {
      if (authState.isAuthenticated) {
        return true;
      }

      auth.signIn(state.url);
      return false;
    })
  );
};
