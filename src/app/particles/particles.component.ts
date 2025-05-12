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

  public myMessage = 'Hello, this is Dave 2.0 - dwebster182@gmail.com';
  public displayedMessage = '';
  private speed = 50;
  private intervalId: any;

  dotsIntervalId: any;
  displayedDots: string = '';

  loading = true;
  loadingDots: string = '';
  loadingDotsIntervalId: any;

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

    const body = { "prompt": prompt };
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'x-api-key': "rSxnSS5RnZ4HqW1lxzY1T8py4F0hYoLH9sVFTqHI"
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

  startLoadingDotsAnimation() {
    let dotCount = 0;
    this.loadingDots = '';
    this.loadingDotsIntervalId = setInterval(() => {
      this.loadingDots += '.';
      dotCount++;
      if (dotCount > 3) {
        this.loadingDots = '';
        dotCount = 0;
      }
    }, 500);
  }

  stopLoadingDotsAnimation() {
    clearInterval(this.loadingDotsIntervalId);
    this.loadingDots = '';
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
    this.startLoadingDotsAnimation();
    const loader = new OBJLoader();
    loader.load(
      '../../assets/me.obj',
      (object: any) => {
        object.position.set(80, 60, -20);

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
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(vUv, 0.5, 1.0);
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
        this.loading = false;
        this.stopLoadingDotsAnimation();
      },
      (xhr: any) => {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error: any) => {
        console.log('An error occurred while loading the .obj model');
        this.loading = false;
        this.stopLoadingDotsAnimation();
      }
    );
  }

  ngAfterViewInit() {
    this.setRendererSize();
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    // Set initial camera position
    // this.camera.position.set(0, -5, -5);  // Camera starts below and behind the object
    // this.camera.lookAt(0, 0, 0);  // Look at the center of the scene

    // Initialize OrbitControls before accessing its properties
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Optional: Configure controls
    this.controls.enableDamping = true; // Enable smooth damping of the controls
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.5;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;

    // Disable controls during animation
    this.controls.enabled = false;

    // Start animation
    this.animate();

    window.addEventListener('resize', () => {
      this.setRendererSize();
    });

    // console.log('Camera initial position:', this.camera.position);
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

    // Pixel cloud special effects (retain this logic)
    this.frame += 0.05; // Adjust the increment for faster or slower motion

    this.scene.traverse((object: any) => {
      if (object instanceof THREE.Mesh) {
        const positionAttribute = object.geometry.getAttribute('position');
        const positionArray = positionAttribute.array as Float32Array;
        const originalArray = object.userData['originalPositions'] as Float32Array;

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

    // Camera animation (move it up and forward to the final position)
    const targetPosition = new THREE.Vector3(0, 0, -1);  // Final camera position
    const animationSpeed = 0.02;  // Adjust speed as necessary

    // Move the camera toward the target Y and Z positions
    if (this.camera.position.y < targetPosition.y) {
      this.camera.position.y += animationSpeed;
    } else {
      this.camera.position.y = targetPosition.y;
    }

    if (this.camera.position.z < targetPosition.z) {
      this.camera.position.z += animationSpeed;
    } else {
      this.camera.position.z = targetPosition.z;
    }

    // Handle the "rotate up" animation first
    if (this.isRotatingUp) {
      this.rotateUpAnimation();
    } else {
      // Once the object is upright, handle the random rotation
      this.randomModelRotation();
    }

    // Ensure the camera looks at the target (center) while it moves
    if (!this.camera.position.equals(targetPosition)) {
      this.camera.lookAt(0, 0, 0);  // Ensure the camera looks at the scene's center
    }

    // Re-enable controls after the camera reaches the final position
    if (this.camera.position.equals(targetPosition)) {
      this.controls.enabled = true;
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  // Variables for rotating the object up from a flat position
  isRotatingUp = true;  // Start by rotating the object up
  rotationUpDuration = 1000;  // Time to complete the rotation (1 second)
  rotationUpStartTime = 0;

  rotateUpAnimation() {
    const currentTime = performance.now();

    // Get the model object by name
    const object = this.scene.getObjectByName('myObject');  // Ensure the model's name is correct

    // If we are rotating the object up, handle that first
    if (this.isRotatingUp) {
      // Set the start time if it's the first frame
      if (this.rotationUpStartTime === 0) {
        this.rotationUpStartTime = currentTime;
      }

      const elapsedTime = currentTime - this.rotationUpStartTime;
      const rotationFactor = elapsedTime / this.rotationUpDuration;  // From 0 to 1

      // Apply the rotation: lying flat to upright (rotating around the Z-axis)
      if (object) {
        object.rotation.x = Math.PI / 2 * (1 - rotationFactor);  // Rotate from 90 degrees to 0
        // console.log(`Rotating up, current Z: ${object.rotation.z}`);
      }

      // Once the object is upright, stop the rotation and proceed with normal animation
      if (elapsedTime >= this.rotationUpDuration) {
        this.isRotatingUp = false;  // End the "rotate up" animation
        if (object) {
          object.rotation.x = 0;  // Ensure it's perfectly upright at the end
        }
      }
    }
  }

  lastRotationTime = 0;
  nextRotationDelay = (Math.random() * 2 + 1) * 1000;  // Random delay between 1 and 3 seconds
  rotationDuration = 1000;  // Duration of the full rotation cycle (1 second)
  rotating = false;
  rotationStartTime = 0;
  originalRotation = 0;  // Store the original Y-axis rotation of the model
  startRight = false;  // Track whether the rotation should start right or left

  randomModelRotation() {
    const currentTime = performance.now();

    // Get the model object by name
    const object = this.scene.getObjectByName('myObject');  // Ensure the model's name is correct

    // If the object exists and the original rotation has not been set, store the initial Y rotation
    if (object && this.originalRotation === 0) {
      this.originalRotation = object.rotation.y;  // Set the original rotation (typically 0)
    }

    // Check if the random delay has passed to start the rotation
    if (!this.rotating && currentTime - this.lastRotationTime > this.nextRotationDelay) {
      this.rotating = true;
      this.rotationStartTime = currentTime;
      this.lastRotationTime = currentTime;
      this.nextRotationDelay = (Math.random() * 9 + 1) * 1000;  // New random delay between 1 and 3 seconds

      // Randomly decide whether to start by rotating right or left
      this.startRight = Math.random() < 0.5;  // 50% chance to start by rotating right
      // console.log(`Starting rotation, next in: ${this.nextRotationDelay / 1000} seconds. Direction: ${this.startRight ? 'Right' : 'Left'}`);
    }

    // Smoothly handle the rotation if the model is currently rotating
    if (this.rotating) {
      const elapsedTime = currentTime - this.rotationStartTime;
      const rotationFactor = Math.sin((elapsedTime / this.rotationDuration) * Math.PI);  // Smooth sine wave (-1 to 1)

      const rotationAmplitude = Math.PI / 64;  // Amplitude of rotation (in radians, adjust as necessary)

      // Determine whether to start moving left or right, based on the startRight flag
      const directionMultiplier = this.startRight ? 1 : -1;

      // Apply the smooth rotation to the Y axis, moving either left or right based on the random direction
      if (object) {
        object.rotation.y = this.originalRotation + directionMultiplier * rotationAmplitude * rotationFactor;
        // console.log(`Rotating Y: ${object.rotation.y}`);  // Debugging to verify left and right movement
      }

      // Stop rotating after the full rotation cycle duration and reset to the original position
      if (elapsedTime >= this.rotationDuration) {
        this.rotating = false;
        if (object) {
          object.rotation.y = this.originalRotation;  // Return to original Y rotation
          // console.log(`Reset Y rotation to: ${this.originalRotation}`);
        }
      }
    }
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
