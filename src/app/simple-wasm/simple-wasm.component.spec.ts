import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleWasmComponent } from './simple-wasm.component';

describe('SimpleWasmComponent', () => {
  let component: SimpleWasmComponent;
  let fixture: ComponentFixture<SimpleWasmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleWasmComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimpleWasmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
