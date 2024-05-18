import { Component } from '@angular/core';
import { WasmComponent } from '../wasm/wasm.component';
import { SimpleWasmComponent } from '../simple-wasm/simple-wasm.component';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-wasm-graphophile',
  standalone: true,
  imports: [WasmComponent, SimpleWasmComponent, CommonModule],
  templateUrl: './wasm-graphophile.component.html',
  styleUrl: './wasm-graphophile.component.css'
})
export class WasmGraphophileComponent {

  showSimpleWasm: boolean = false;
  showComplexWasm: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  toggleSimpleWasm() {
    this.showSimpleWasm = true;
    this.showComplexWasm = false;
    this.cdr.detectChanges(); 
  }

  toggleComplexWasm() {
    this.showSimpleWasm = false;
    this.showComplexWasm = true;
    this.cdr.detectChanges(); 
  }
}
