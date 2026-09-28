import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutPageComponent } from './about-page/about-page.component';
import { HomeComponent } from './home/home.component';
import { AnchorKeepWorkspaceComponent } from './anchorkeep-workspace/anchorkeep-workspace.component';
import { authGuard } from './auth/auth.guard';
import { AnchorKeepVentureComponent } from './ventures/anchorkeep-venture/anchorkeep-venture.component';
import { LabNotebookComponent } from './lab-notebook/lab-notebook.component';
import { GoblinHomeComponent } from './goblin-home/goblin-home.component';
import { LlmInputLabComponent } from './labs/llm-input-lab/llm-input-lab.component';
import { GreenlightVentureComponent } from './ventures/greenlight-venture/greenlight-venture.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: GoblinHomeComponent,
    title: 'Gobwen | Small models. Open curiosity.',
    pathMatch: 'full'
  },
  { path: 'about', component: AboutPageComponent, title: 'About & support | David Webster' },
  { path: 'profile', component: HomeComponent, title: 'Experience & CV | David Webster' },
  { path: 'research', component: LabNotebookComponent, data: { section: 'articles' }, title: 'Research | David Webster' },
  { path: 'research/runs', component: LabNotebookComponent, data: { section: 'runs' }, title: 'Run journal | David Webster' },
  { path: 'research/roadmap', component: LabNotebookComponent, data: { section: 'roadmap' }, title: 'Roadmap | David Webster' },
  { path: 'research/architecture', component: LabNotebookComponent, data: { section: 'architecture' }, title: 'Architecture | David Webster' },
  { path: 'research/questions', component: LabNotebookComponent, data: { section: 'research' }, title: 'Research questions | David Webster' },
  { path: 'research/models', component: LabNotebookComponent, data: { section: 'models' }, title: 'Meet the models | David Webster' },
  { path: 'research/performance', component: LabNotebookComponent, data: { section: 'performance' }, title: 'Measuring speed | David Webster' },
  { path: 'notebook', redirectTo: 'research', pathMatch: 'full' },
  { path: 'notebook/runs', redirectTo: 'research/runs', pathMatch: 'full' },
  { path: 'notebook/roadmap', redirectTo: 'research/roadmap', pathMatch: 'full' },
  { path: 'notebook/architecture', redirectTo: 'research/architecture', pathMatch: 'full' },
  { path: 'notebook/research', redirectTo: 'research/questions', pathMatch: 'full' },
  { path: 'notebook/funding', component: LabNotebookComponent, data: { section: 'funding' }, title: 'Funding plan | David Webster' },
  {
    path: 'ventures',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'projects',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'ventures/anchorkeep',
    component: AnchorKeepVentureComponent,
    title: 'AnchorKeep | Paused project · David Webster'
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
    component: GreenlightVentureComponent,
    title: 'Greenlight | Paused project · David Webster'
  },
  {
    path: 'labs',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'labs/llm-input-hardening',
    component: LlmInputLabComponent,
    title: 'Text inspector | David Webster'
  },
  {
    path: 'anchorkeep',
    component: AnchorKeepWorkspaceComponent,
    title: 'AnchorKeep workspace | David Webster',
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
  imports: [RouterModule.forRoot(appRoutes, {
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled',
    scrollOffset: [0, 90]
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
