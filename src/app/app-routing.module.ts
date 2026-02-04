import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { RdComponent } from './rd/rd.component';
import { SelectedWorkComponent } from './selected-work/selected-work.component';
import { WritingComponent } from './writing/writing.component';
import { AboutComponent } from './about/about.component';

const routes: Routes = [
  {
    path: "",
    component: HomeComponent
  },
  {
    path: "rd",
    component: RdComponent,
  },
  {
    path: "selected-work",
    component: SelectedWorkComponent,
  },
  {
    path: "writing",
    component: WritingComponent,
  },
  {
    path: "about",
    component: AboutComponent,
  },
  {
    path: "privacy",
    component: PrivacyComponent
  },
  {
    path: "disrupt",
    redirectTo: "rd",
    pathMatch: "full"
  },
  {
    path: "homomorphic",
    redirectTo: "selected-work",
    pathMatch: "full"
  },
  {
    path: "wasm-graphophile",
    redirectTo: "rd",
    pathMatch: "full"
  },
  {
    path: "contact",
    redirectTo: "about",
    pathMatch: "full"
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {scrollPositionRestoration: 'top'})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
