import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  activeSlideIndex = 0;
  totalSlides = 4;

  texts = [
    'Ever used a service and thought, <strong style="color:lime;">this could be better?</strong>',
    'Your idea could revolutionize the <strong style="color:lime;">customer experience</strong>',
    'Lets turn your <strong style="color:lime;">vision</strong> into <strong style="color:lime;">reality.</strong>'
  ];

  prevSlide() {
    if (this.activeSlideIndex > 0) {
      this.activeSlideIndex--;
    }
  }

  nextSlide() {
    if (this.activeSlideIndex < this.totalSlides - 1) {
      this.activeSlideIndex++;
    }
  }
}