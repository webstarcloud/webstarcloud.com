import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HomeComponent } from './home/home.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { DodecahedronComponent } from './dodecahedron/dodecahedron.component';
import { IcosahedronComponent } from './icosahedron/icosahedron.component';
import { OctahedronComponent } from './octahedron/octahedron.component';
import { BackgroundComponent } from './background/background.component';
import { ParticlesComponent } from './particles/particles.component';
import { LogoComponent } from './logo/logo.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RdComponent } from './rd/rd.component';
import { SelectedWorkComponent } from './selected-work/selected-work.component';
import { WritingComponent } from './writing/writing.component';
import { AboutComponent } from './about/about.component';
import { GlobalErrorHandler } from './core/global-error-handler';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    PrivacyComponent,
    DodecahedronComponent,
    IcosahedronComponent,
    OctahedronComponent,
    BackgroundComponent,
    ParticlesComponent,
    LogoComponent,
    RdComponent,
    SelectedWorkComponent,
    WritingComponent,
    AboutComponent,
  ],
  imports: [
    FormsModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    CommonModule
  ],
  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
