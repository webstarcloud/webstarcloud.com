import { Component } from '@angular/core';
import { WasmComponent } from '../wasm/wasm.component';

@Component({
  selector: 'app-wasm-graphophile',
  standalone: true,
  imports: [WasmComponent],
  templateUrl: './wasm-graphophile.component.html',
  styleUrl: './wasm-graphophile.component.css'
})
export class WasmGraphophileComponent {

}
