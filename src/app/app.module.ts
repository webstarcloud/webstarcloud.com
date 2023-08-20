import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HomeComponent } from './home/home.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { DodecahedronComponent } from './dodecahedron/dodecahedron.component';
import { IcosahedronComponent } from './icosahedron/icosahedron.component';
import { OctahedronComponent } from './octahedron/octahedron.component';
import { BackgroundComponent } from './background/background.component';
import { ContactComponent } from './contact/contact.component';
import { ParticlesComponent } from './particles/particles.component';
import { LogoComponent } from './logo/logo.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    PrivacyComponent,
    DodecahedronComponent,
    IcosahedronComponent,
    OctahedronComponent,
    BackgroundComponent,
    ContactComponent,
    ParticlesComponent,
    LogoComponent,
  ],
  imports: [
    FormsModule,
    BrowserModule,
    AppRoutingModule,
    AmplifyAuthenticatorModule,
    BrowserAnimationsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
