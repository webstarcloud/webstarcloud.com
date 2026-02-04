import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  interfaceActive = false;
  @ViewChild('interfacePanel') interfacePanel?: ElementRef<HTMLDivElement>;

  activateInterface() {
    this.interfaceActive = true;
    setTimeout(() => {
      this.interfacePanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }
}
