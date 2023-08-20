import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DodecahedronComponent } from './dodecahedron.component';

describe('DodecahedronComponent', () => {
  let component: DodecahedronComponent;
  let fixture: ComponentFixture<DodecahedronComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DodecahedronComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DodecahedronComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
