import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { ResearchArchitectureComponent } from '../research-architecture/research-architecture.component';

@Component({
  selector: 'app-lab-notebook',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ResearchArchitectureComponent],
  templateUrl: './lab-notebook.component.html',
  styleUrl: './lab-notebook.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabNotebookComponent {
  readonly section$ = inject(ActivatedRoute).data.pipe(map(data => data['section'] as string));
  readonly pages = [
    { path: '/research', title: 'Articles' }, { path: '/research/runs', title: 'Run journal' },
    { path: '/research/roadmap', title: 'Roadmap' }, { path: '/research/architecture', title: 'Architecture' },
    { path: '/research/questions', title: 'Questions' }
  ];
}
