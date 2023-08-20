import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OctahedronComponent } from './octahedron.component';

describe('OctahedronComponent', () => {
  let component: OctahedronComponent;
  let fixture: ComponentFixture<OctahedronComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OctahedronComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OctahedronComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
