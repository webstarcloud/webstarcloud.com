import { Component } from '@angular/core';
import { PHRASE_ROTATION, PILLAR_DEFINITIONS, PillarDefinition } from '../content/brand';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  readonly pillarDefinitions: PillarDefinition[] = PILLAR_DEFINITIONS;
  readonly phraseRotation: string[] = PHRASE_ROTATION;
}
