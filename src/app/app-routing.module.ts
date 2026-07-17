import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AnchorKeepWorkspaceComponent } from './anchorkeep-workspace/anchorkeep-workspace.component';
import { authGuard } from './auth/auth.guard';
import { AnchorKeepVentureComponent } from './ventures/anchorkeep-venture/anchorkeep-venture.component';
import { VenturesComponent } from './ventures/ventures.component';
import { LabsComponent } from './labs/labs.component';
import { LlmInputLabComponent } from './labs/llm-input-lab/llm-input-lab.component';
import { GreenlightVentureComponent } from './ventures/greenlight-venture/greenlight-venture.component';

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
    path: 'ventures/anchorkeep',
    component: AnchorKeepVentureComponent
  },
  {
    path: 'ventures/safegit',
    redirectTo: 'ventures/anchorkeep',
    pathMatch: 'full'
  },
  {
    path: 'ventures/greenlight',
    redirectTo: 'greenlight',
    pathMatch: 'full'
  },
  {
    path: 'greenlight',
    component: GreenlightVentureComponent
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
    path: 'anchorkeep',
    component: AnchorKeepWorkspaceComponent,
    canActivate: [authGuard]
  },
  {
    path: 'safegit',
    redirectTo: 'anchorkeep',
    pathMatch: 'full'
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
