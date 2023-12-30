import { Component, OnInit, ElementRef, Renderer2, ViewChild } from '@angular/core';

@Component({
  selector: 'app-simple-wasm',
  templateUrl: './simple-wasm.component.html',
  styleUrls: ['./simple-wasm.component.css'],
  standalone: true
})
export class SimpleWasmComponent implements OnInit {
  @ViewChild('wasmContainer', { static: true }) wasmContainer?: ElementRef;
  @ViewChild('fpsDisplay') fpsDisplay?: ElementRef;
  
  private prevTime: number = performance.now();
  private frameCount: number = 0;
  private animationFrameId?: number;


  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.loadWasm();
    this.onWindowResize(); // Set initial size
    window.addEventListener('resize', () => this.onWindowResize());
    this.startAnimationLoop();
  }

  startAnimationLoop() {
    const loop = (time: number) => {
      // Increment the frame count
      this.frameCount++;
  
      // Calculate the elapsed time
      const elapsedTime = time - this.prevTime;
  
      // Update FPS every second
      if (elapsedTime >= 1000) {
        const fps = this.frameCount / (elapsedTime / 1000);
        this.updateFPS(fps);
  
        // Reset for the next second
        this.frameCount = 0;
        this.prevTime = time;
      }
  
      // Continue the loop
      this.animationFrameId = requestAnimationFrame(loop);
    };
  
    this.animationFrameId = requestAnimationFrame(loop);
  }
  
  ngOnDestroy() {
    window.removeEventListener('resize', () => this.onWindowResize());
  
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // Placeholder method - replace with actual WASM FPS retrieval method
  getFPSFromWasm(): number {
    // Example: return this.wasmModule.getFPS();
    return 60; // Replace with actual WASM call
  }

  updateFPS(fps: number) {
    if (this.fpsDisplay) {
      this.fpsDisplay.nativeElement.innerText = `FPS: ${fps.toFixed(2)}`;
    }
  }

  loadWasm() {
    if (this.wasmContainer) {
      const container = this.wasmContainer.nativeElement;

      // Create and append the canvas element
      const canvas = this.renderer.createElement('canvas');
      this.renderer.setProperty(canvas, 'id', 'glcanvas');
      this.renderer.setAttribute(canvas, 'tabindex', '1');
      // canvas.addEventListener('mousemove', (event: any) => this.onCanvasMouseMove(event, canvas));
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
    if (canvas) {
      // Set canvas to the full size of the window
      canvas.width = window.innerWidth / 4;
      canvas.height = window.innerHeight / 4;

      // Notify the WASM module about the resize, if necessary
    }
  }
  
}
