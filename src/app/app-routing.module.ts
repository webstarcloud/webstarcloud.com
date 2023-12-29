import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { ContactComponent } from './contact/contact.component';
import { DisruptionComponent } from './disruption/disruption.component';
import { WasmGraphophileComponent } from './wasm-graphophile/wasm-graphophile.component';

const routes: Routes = [
  {
    path: "",
    component: HomeComponent
  },
  {
    path: "contact",
    component: ContactComponent,
  },
  {
    path: "privacy",
    component: PrivacyComponent
  },
  {
    path: "disrupt",
    component: DisruptionComponent
  },
  {
    path: 'wasm-graphophile',
    component: WasmGraphophileComponent
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