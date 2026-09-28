import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoblinChamberComponent } from '../goblin-chamber/goblin-chamber.component';
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, GoblinChamberComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {}
