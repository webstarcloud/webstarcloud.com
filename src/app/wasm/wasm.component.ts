import { Component, OnInit, ElementRef, Renderer2, ViewChild } from '@angular/core';

@Component({
  selector: 'app-wasm-component',
  template: '<div #wasmContainer></div>',
  standalone: true
})
export class WasmComponent implements OnInit {
  @ViewChild('wasmContainer', { static: true }) wasmContainer?: ElementRef;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.loadWasm();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.onWindowResize());
  }

  loadWasm() {
    if (this.wasmContainer) {
      const container = this.wasmContainer.nativeElement;

      // Create and append the canvas element
      const canvas = this.renderer.createElement('canvas');
      this.renderer.setProperty(canvas, 'id', 'glcanvas');
      this.renderer.setAttribute(canvas, 'tabindex', '1');
      canvas.addEventListener('mousemove', (event: any) => this.onCanvasMouseMove(event, canvas));
      this.renderer.appendChild(container, canvas);

      // Create the mq_js_bundle.js script
      const mqBundleScript = this.renderer.createElement('script');
      this.renderer.setProperty(mqBundleScript, 'src', 'https://not-fl3.github.io/miniquad-samples/mq_js_bundle.js');

      // Event listener to call load function after mq_js_bundle.js is loaded
      mqBundleScript.onload = () => {
        const wasmScript = this.renderer.createElement('script');
        this.renderer.setProperty(wasmScript, 'innerHTML', `load('assets/view_social_network.wasm');`);
        this.renderer.appendChild(container, wasmScript);
      };

      // Append the mq_js_bundle.js script
      this.renderer.appendChild(container, mqBundleScript);
    }
  }

  onCanvasMouseMove(event: MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
  
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
  
    // Example interaction: Log the coordinates or pass them to the WASM module
    console.log(`Mouse position on canvas: (${canvasX}, ${canvasY})`);
    // If you have a function in your WASM to handle these coordinates, call it here
  }

  onWindowResize() {
    const canvas: HTMLCanvasElement = this.wasmContainer?.nativeElement.querySelector('#glcanvas');
    if (canvas && this.wasmContainer) {
      const container = this.wasmContainer.nativeElement;
      // Set canvas to the full width of its container, maintaining aspect ratio
      canvas.width = container.clientWidth;
      const aspectRatio = 16 / 9; // Example aspect ratio, adjust as needed
      canvas.height = container.clientWidth / aspectRatio;
  
      // You may need to notify the WASM module about the resize
      // For example, if you have a 'resizeCanvas' function in your WASM
      // wasmModule.resizeCanvas(canvas.width, canvas.height);
    }
  }
  
}
