import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WasmComponent } from './wasm.component';

describe('WasmComponent', () => {
  let component: WasmComponent;
  let fixture: ComponentFixture<WasmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WasmComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WasmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
