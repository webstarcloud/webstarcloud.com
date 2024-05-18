import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomomorphicComponent } from './homomorphic.component';

describe('HomomorphicComponent', () => {
  let component: HomomorphicComponent;
  let fixture: ComponentFixture<HomomorphicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomomorphicComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomomorphicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
