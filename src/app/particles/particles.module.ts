import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArtifactViewerComponent } from '../artifact-viewer/artifact-viewer.component';
import { HardeningReceiptComponent } from './hardening-receipt.component';
import { ParticlesComponent } from './particles.component';

/** Share the original avatar between the personal chat and the research chamber. */
@NgModule({
  declarations: [ParticlesComponent, ArtifactViewerComponent],
  imports: [CommonModule, FormsModule, HardeningReceiptComponent],
  exports: [ParticlesComponent]
})
export class ParticlesModule {}
