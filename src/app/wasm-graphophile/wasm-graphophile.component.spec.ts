import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WasmGraphophileComponent } from './wasm-graphophile.component';

describe('WasmGraphophileComponent', () => {
  let component: WasmGraphophileComponent;
  let fixture: ComponentFixture<WasmGraphophileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WasmGraphophileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WasmGraphophileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
