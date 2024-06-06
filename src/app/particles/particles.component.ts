import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements AfterViewInit {

  @ViewChild('rendererContainer') rendererContainer!: ElementRef;

  renderer = new THREE.WebGLRenderer({ alpha: true });
  scene;
  camera;
  controls: any;
  frame = 0;
  active: boolean = true;
  question = "";
  isDisabled: boolean = false;

  public myMessage = 'Hello, this is Dave 2.0 - david@webstarcloud.com';
  public displayedMessage = '';
  private speed = 50;
  private intervalId: any;

  dotsIntervalId: any;
  displayedDots: string = '';

  constructor(private http: HttpClient) {
    this.scene = new THREE.Scene();
    this.scene.background = null; // Ensure background is transparent

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 0, -1);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 0, 2);
    pointLight.position.set(50, 50, 50);
    this.scene.add(pointLight);

    this.loadOBJModel();
    this.startTyping(this.myMessage);
  }

  getData(prompt: string) {
    let api_key = "rSxnSS5RnZ4HqW1lxzY1T8py4F0hYoLH9sVFTqHI"

    const body = { "prompt": prompt };
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      "x-api-key": api_key
    });

    this.http.post('https://clzngwfhz1.execute-api.eu-west-1.amazonaws.com/test', body, { headers }).subscribe(response => {
      this.stopDotsAnimation();  // Stop the dots animation once response is received
      this.startTyping(response.toString())
    }, error => {
      this.stopDotsAnimation();  // Stop the dots animation on error as well
      console.error(error);
      this.startTyping("My brain hurts to much today")
    });
  }

  askQuestion() {
    this.isDisabled = true;
    this.displayedMessage = "Braining";
    this.startDotsAnimation();
    this.getData(this.question);
  }

  startDotsAnimation() {
    let dotCount = 0;
    this.dotsIntervalId = setInterval(() => {
      this.displayedDots += '.';
      dotCount++;
      if (dotCount > 3) {
        this.displayedDots = '';
        dotCount = 0;
      }
    }, 500);  // Adjust the speed as needed
  }

  stopDotsAnimation() {
    clearInterval(this.dotsIntervalId);
    this.displayedDots = ''; // Reset the dots string
  }

  startTyping(my_msg: string) {
    let i = 0;
    this.displayedMessage = "";  // Reset displayedMessage to an empty string
    this.intervalId = setInterval(() => {
      if (i < my_msg.length) {
        this.displayedMessage += my_msg[i];
        i++;
      } else {
        clearInterval(this.intervalId);
        this.isDisabled = false;
      }
    }, this.speed);
  }

  resetObject() {
    // Traverse the scene and find the object by name
    this.scene.traverse((object: any) => {
      if (object.name === 'myObject') {
        // Reset the object's position, rotation, and scale to the initial values
        object.position.set(-30, 90, 0);
        object.rotation.set(0, 0, 0);
        object.rotation.z = THREE.MathUtils.degToRad(90);
        object.rotation.y = THREE.MathUtils.degToRad(-10);
        object.scale.set(10, 10, 10);
      }
    });
  }

  loadOBJModel = () => {
    const loader = new OBJLoader();
    loader.load(
      '../../assets/me.obj',
      (object: any) => {
        object.position.set(80, 20, -20);
        object.name = 'myObject';
        object.scale.set(10, 10, 10); // Adjust as necessary

        object.rotation.z = THREE.MathUtils.degToRad(90);
        object.rotation.y = THREE.MathUtils.degToRad(-10);
        object.rotation.x = THREE.MathUtils.degToRad(-10);

        const vertexShader = `
          uniform float pointSize;
          varying vec2 vUv;
          uniform float time;
          void main() {
            gl_PointSize = pointSize;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;

        const fragmentShader = `
          void main() {
            gl_FragColor = vec4(0.5, 0.0, 1.0, 1.0); // RGBA for purple
          }
        `;

        const material = new THREE.ShaderMaterial({
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          uniforms: {
            pointSize: { value: 1 },
            time: { value: 0 }
          }
        });

        object.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;

            // Store the original vertex positions
            const positionAttribute = child.geometry.getAttribute('position');
            const positionArray = positionAttribute.array as Float32Array;
            child.userData['originalPositions'] = new Float32Array(positionArray.length);
            child.userData['originalPositions'].set(positionArray);
          }
        });

        this.scene.add(object);
      },
      (xhr: any) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error: any) => {
        console.log('An error occurred while loading the .obj model');
      }
    );
  }

  ngAfterViewInit() {
    this.setRendererSize();
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.setRendererSize();
    });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Optional: Configure controls
    this.controls.enableDamping = true; // Enable smooth damping of the controls
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.5; // Adjust if the controls rotate too fast

    // Disable panning and zooming
    this.controls.enablePan = false;
    this.controls.enableZoom = false;

    // Restrict rotation to only the Y-axis (left and right)
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;

    this.animate();
  }

  setRendererSize() {
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    if (!this.active) return;

    window.requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);

    this.frame += 0.05; // Adjust the increment for faster or slower motion

    // Update the vertex positions of the loaded object's meshes
    this.scene.traverse((object: any) => {
      if (object instanceof THREE.Mesh) {
        const positionAttribute = object.geometry.getAttribute('position');
        const positionArray = positionAttribute.array as Float32Array;
        const originalArray = object.userData['originalPositions'] as Float32Array; // Use the stored original positions

        for (let i = 0; i < positionArray.length; i += 3) {
          const x = originalArray[i];
          const y = originalArray[i + 1];
          const z = originalArray[i + 2];

          const position_multiplier = 0.2;

          positionArray[i] = x + Math.cos(this.frame + x) * position_multiplier;
          positionArray[i + 1] = y + Math.sin(this.frame + y) * position_multiplier;
          positionArray[i + 2] = z + Math.cos(this.frame + z) * position_multiplier;
        }

        positionAttribute.needsUpdate = true;
      }
    });
  }

  ngOnDestroy() {
    this.active = false;
    this.renderer.dispose();

    // Dispose of materials, geometry, and controls
    this.scene.traverse((object: any) => {
      if (object instanceof THREE.Mesh) {
        object.material.dispose();
        object.geometry.dispose();
      }
    });

    this.controls.dispose();
  }
}
