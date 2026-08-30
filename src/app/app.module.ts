import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { HomeComponent } from './home/home.component';
import { ParticlesComponent } from './particles/particles.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ArtifactViewerComponent } from './artifact-viewer/artifact-viewer.component';
import { AuthPanelComponent } from './auth/auth-panel.component';
import { AuthModule, LogLevel } from 'angular-auth-oidc-client';
import { environment } from '../environments/environment';
import { readPostLoginRoute } from './auth/auth-return';

function buildRedirectUrl(path: string) {
  const fallbackOrigin = 'https://davidwebstar.com';
  const origin = typeof window === 'undefined' ? fallbackOrigin : window.location.origin;
  if (!path || path === '/') {
    return origin;
  }

  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}

const oidcConfig = {
  authority: environment.auth.authority,
  redirectUrl: buildRedirectUrl(environment.auth.redirectPath),
  clientId: environment.auth.clientId,
  scope: environment.auth.scope,
  responseType: environment.auth.responseType,
  autoUserInfo: true,
  silentRenew: false,
  useRefreshToken: false,
  postLoginRoute: readPostLoginRoute('/'),
  logLevel: LogLevel.None
};


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ParticlesComponent,
    ArtifactViewerComponent,
    AuthPanelComponent,
  ],
  imports: [
    FormsModule,
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    AuthModule.forRoot({
      config: oidcConfig
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
