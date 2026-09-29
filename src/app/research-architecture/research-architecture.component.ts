import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-research-architecture',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './research-architecture.component.html',
  styleUrls: ['../lab-notebook/lab-notebook.component.css', './research-architecture.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResearchArchitectureComponent {

}
