import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HttpClient, HttpHeaders } from '@angular/common/http';


// Make sure to correctly import OBJLoader based on your setup

@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements AfterViewInit {

  @ViewChild('rendererContainer') rendererContainer!: ElementRef;

  renderer = new THREE.WebGLRenderer();
  scene;
  camera;
  width = window.innerWidth;
  height = window.innerHeight;
  controls: any;
  frame = 0;
  active: boolean = true;
  question = ""
  isDisabled: boolean = false;


  public myMessage = 'Hello, this is Dave 2.0 - david@webstarcloud.com';
  public displayedMessage = '';
  private speed = 100;
  private intervalId: any;

  dotsIntervalId: any;
  displayedDots: string = '';

  constructor(private http: HttpClient) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6f2da8);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);

    // this.camera.position.set(0, 90, 10);  // Move the camera back and align it with the object's position
    // this.camera.lookAt(0, 90, 0);  // Make the camera look at the object
    // this.camera.aspect = this.width / this.height;
    // this.camera.updateProjectionMatrix();

    this.camera.position.set(0, 0, -1);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

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

    let api_key = "YubCyyGw6R17z659SP1R96V2U3FcZcXM23EfRd1E"

    const body = {
      "prompt": prompt
    }; 

    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      "x-api-key": api_key
      // "Authorization": access_token,
      // "Access-Control-Allow-Origin": "*", 
      // "Access-Control-Allow-Credentials": "true"
    });

    this.http.post('https://clzngwfhz1.execute-api.eu-west-1.amazonaws.com/test', body, {headers}).subscribe(response => {
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
    console.log("Stopping dots animation"); // Debugging line
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
        console.log('Object found:', object);

        // Reset the object's position, rotation, and scale to the initial values
        object.position.set(-30, 90, 0);
        object.rotation.set(0, 0, 0);
        object.rotation.z = THREE.MathUtils.degToRad(90);
        object.rotation.y = THREE.MathUtils.degToRad(-10);
        object.scale.set(10, 10, 10);

        console.log('Object reset:', object);
      }
    });
  }


  loadOBJModel = () => {
    const loader = new OBJLoader();
    loader.load(
      '../../assets/me.obj',
      (object: any) => {

        // object.rotation.set(0, 0, 0);
        object.position.set(80, 20, -20);
        object.name = 'myObject';
        object.scale.set(10, 10, 10); // Adjust as necessary

        object.rotation.z = THREE.MathUtils.degToRad(90)
        object.rotation.y = THREE.MathUtils.degToRad(-10)
        object.rotation.x = THREE.MathUtils.degToRad(-10)

        const vertexShader = `
  varying vec2 vUv;
  uniform float time;
  void main() {
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
            time: { value: 0 }
          }
        });

        //   object.traverse((child: any) => {
        //     if (child instanceof THREE.Mesh) {
        //         child.material.color.set(0x00FF00);
        //         const positionAttribute = child.geometry.getAttribute('position');
        //         const positionArray = positionAttribute.array as Float32Array;

        //         for (let i = 0; i < positionArray.length; i += 3) {
        //             const x = positionArray[i];
        //             const y = positionArray[i + 1];
        //             const z = positionArray[i + 2];

        //             positionArray[i] = x + Math.cos(this.frame + x) * 0.1;
        //             positionArray[i + 1] = y + Math.sin(this.frame + y) * 0.1;
        //             positionArray[i + 2] = z + Math.cos(this.frame + z) * 0.1;
        //         }

        //         positionAttribute.needsUpdate = true;
        //     }
        // });

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

        material.uniforms['time'].value += 0.1;
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
    this.renderer.setSize(this.width, this.height * 0.85);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
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