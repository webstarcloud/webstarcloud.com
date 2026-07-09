import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SafegitWorkspaceComponent } from './safegit-workspace/safegit-workspace.component';
import { authGuard } from './auth/auth.guard';
import { SafegitVentureComponent } from './ventures/safegit-venture/safegit-venture.component';
import { VenturesComponent } from './ventures/ventures.component';
import { LabsComponent } from './labs/labs.component';
import { LlmInputLabComponent } from './labs/llm-input-lab/llm-input-lab.component';

const routes: Routes = [
  {
    path: "",
    component: HomeComponent
  },
  {
    path: 'ventures',
    component: VenturesComponent
  },
  {
    path: 'ventures/safegit',
    component: SafegitVentureComponent
  },
  {
    path: 'labs',
    component: LabsComponent
  },
  {
    path: 'labs/llm-input-hardening',
    component: LlmInputLabComponent
  },
  {
    path: 'safegit',
    component: SafegitWorkspaceComponent,
    canActivate: [authGuard]
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
