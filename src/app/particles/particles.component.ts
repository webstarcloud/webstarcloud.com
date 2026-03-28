import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HttpClient, HttpHeaders } from '@angular/common/http';

type ParticleMode = 'architecture' | 'agentic' | 'migration' | 'resilience' | 'tooling';

interface ModeTheme {
  accentA: number;
  accentB: number;
  keywords: string[];
}

@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef<HTMLDivElement>;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  controls?: OrbitControls;
  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  pointLight = new THREE.PointLight(0xffffff, 1, 0, 2);
  frame = 0;
  active = true;
  question = '';
  isDisabled = false;

  public myMessage = 'Hello, this is Dave 2.0 - dwebster182@gmail.com';
  public displayedMessage = '';
  private readonly speed = 50;
  private intervalId?: number;

  dotsIntervalId?: number;
  displayedDots = '';

  loading = true;
  loadingDots = '';
  loadingDotsIntervalId?: number;
  private readonly desktopModelPosition = new THREE.Vector3(80, 12, -20);
  private readonly desktopScale = 10;
  private readonly modeThemes: Record<ParticleMode, ModeTheme> = {
    architecture: {
      accentA: 0x66d6ff,
      accentB: 0x8d90ff,
      keywords: ['architecture', 'system', 'systems', 'distributed', 'scale', 'platform', 'invariant']
    },
    agentic: {
      accentA: 0x71ffb6,
      accentB: 0x4ddfff,
      keywords: ['agent', 'agentic', 'agents', 'autonomy', 'guardrail', 'tools', 'tooling']
    },
    migration: {
      accentA: 0xffcf68,
      accentB: 0xff8c66,
      keywords: ['migration', 'migrate', 'legacy', 'cutover', 'rebuild', 'replace']
    },
    resilience: {
      accentA: 0xff8c9d,
      accentB: 0xffc06b,
      keywords: ['resilience', 'incident', 'failure', 'outage', 'security', 'recovery']
    },
    tooling: {
      accentA: 0x9eacff,
      accentB: 0x7effd5,
      keywords: ['tooling', 'pipeline', 'automation', 'developer', 'rust', 'wasm', 'typescript']
    }
  };
  private activeMode: ParticleMode = 'architecture';
  private shaderMaterial?: THREE.ShaderMaterial;
  private readonly currentAccentA = new THREE.Color();
  private readonly currentAccentB = new THREE.Color();
  private readonly targetAccentA = new THREE.Color();
  private readonly targetAccentB = new THREE.Color();
  private readonly colorTransitionFactor = 0.08;

  isRotatingUp = true;
  rotationUpDuration = 1000;
  rotationUpStartTime = 0;
  lastRotationTime = 0;
  nextRotationDelay = (Math.random() * 2 + 1) * 1000;
  rotationDuration = 1000;
  rotating = false;
  rotationStartTime = 0;
  originalRotation = 0;
  startRight = false;

  constructor(private http: HttpClient) {
    this.scene.background = null;
    this.camera.position.set(0, 0, -1);

    this.pointLight.position.set(50, 50, 50);
    this.scene.add(this.ambientLight, this.pointLight);
    this.setInitialSceneMode(this.activeMode);

    this.loadOBJModel();
    this.startTyping(this.myMessage);
  }

  getData(prompt: string) {
    const body = { prompt };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': 'rSxnSS5RnZ4HqW1lxzY1T8py4F0hYoLH9sVFTqHI'
    });

    this.http.post('https://clzngwfhz1.execute-api.eu-west-1.amazonaws.com/test', body, { headers }).subscribe(response => {
      this.stopDotsAnimation();
      this.startTyping(response.toString());
    }, error => {
      this.stopDotsAnimation();
      console.error(error);
      this.startTyping('My brain hurts to much today');
    });
  }

  askQuestion() {
    const prompt = this.question.trim();
    if (!prompt) {
      return;
    }

    this.setModeForPrompt(prompt);
    this.isDisabled = true;
    this.displayedMessage = 'Braining';
    this.startDotsAnimation();
    this.getData(prompt);
  }

  startLoadingDotsAnimation() {
    let dotCount = 0;
    this.loadingDots = '';
    this.loadingDotsIntervalId = window.setInterval(() => {
      this.loadingDots += '.';
      dotCount++;
      if (dotCount > 3) {
        this.loadingDots = '';
        dotCount = 0;
      }
    }, 500);
  }

  stopLoadingDotsAnimation() {
    if (this.loadingDotsIntervalId) {
      window.clearInterval(this.loadingDotsIntervalId);
      this.loadingDotsIntervalId = undefined;
    }
    this.loadingDots = '';
  }

  startDotsAnimation() {
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
    }

    let dotCount = 0;
    this.displayedDots = '';
    this.dotsIntervalId = window.setInterval(() => {
      this.displayedDots += '.';
      dotCount++;
      if (dotCount > 3) {
        this.displayedDots = '';
        dotCount = 0;
      }
    }, 500);
  }

  stopDotsAnimation() {
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
      this.dotsIntervalId = undefined;
    }
    this.displayedDots = '';
  }

  startTyping(myMessage: string) {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }

    let index = 0;
    this.displayedMessage = '';
    this.intervalId = window.setInterval(() => {
      if (index < myMessage.length) {
        this.displayedMessage += myMessage[index];
        index++;
      } else {
        if (this.intervalId) {
          window.clearInterval(this.intervalId);
          this.intervalId = undefined;
        }
        this.isDisabled = false;
      }
    }, this.speed);
  }

  private setModeForPrompt(prompt: string) {
    const normalized = prompt.toLowerCase();
    let nextMode: ParticleMode = 'architecture';
    let bestScore = 0;

    (Object.entries(this.modeThemes) as [ParticleMode, ModeTheme][]).forEach(([mode, theme]) => {
      const score = theme.keywords.filter((keyword) => normalized.includes(keyword)).length;
      if (score > bestScore) {
        bestScore = score;
        nextMode = mode;
      }
    });

    this.activeMode = nextMode;
    this.queueSceneModeTransition(nextMode);
  }

  private setInitialSceneMode(mode: ParticleMode) {
    const theme = this.modeThemes[mode];
    this.currentAccentA.setHex(theme.accentA);
    this.currentAccentB.setHex(theme.accentB);
    this.targetAccentA.copy(this.currentAccentA);
    this.targetAccentB.copy(this.currentAccentB);
    this.syncScenePalette();
  }

  private queueSceneModeTransition(mode: ParticleMode) {
    const theme = this.modeThemes[mode];
    this.targetAccentA.setHex(theme.accentA);
    this.targetAccentB.setHex(theme.accentB);
  }

  private syncScenePalette() {
    this.ambientLight.color.copy(this.currentAccentA);
    this.pointLight.color.copy(this.currentAccentB);

    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms['accentA'].value.copy(this.currentAccentA);
      this.shaderMaterial.uniforms['accentB'].value.copy(this.currentAccentB);
      this.shaderMaterial.uniforms['time'].value = this.frame;
    }
  }

  private updateSceneModeTransition() {
    const accentADelta = this.getColorDelta(this.currentAccentA, this.targetAccentA);
    const accentBDelta = this.getColorDelta(this.currentAccentB, this.targetAccentB);

    if (accentADelta < 0.0001 && accentBDelta < 0.0001) {
      return;
    }

    this.currentAccentA.lerp(this.targetAccentA, this.colorTransitionFactor);
    this.currentAccentB.lerp(this.targetAccentB, this.colorTransitionFactor);

    if (this.getColorDelta(this.currentAccentA, this.targetAccentA) < 0.0001) {
      this.currentAccentA.copy(this.targetAccentA);
    }

    if (this.getColorDelta(this.currentAccentB, this.targetAccentB) < 0.0001) {
      this.currentAccentB.copy(this.targetAccentB);
    }

    this.syncScenePalette();
  }

  private getColorDelta(current: THREE.Color, target: THREE.Color) {
    const redDelta = current.r - target.r;
    const greenDelta = current.g - target.g;
    const blueDelta = current.b - target.b;
    return redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta;
  }

  loadOBJModel = () => {
    this.startLoadingDotsAnimation();
    const loader = new OBJLoader();
    loader.load(
      '../../assets/me.obj',
      (object: THREE.Object3D) => {
        object.name = 'myObject';

        object.rotation.z = THREE.MathUtils.degToRad(90);
        object.rotation.y = THREE.MathUtils.degToRad(-10);
        object.rotation.x = THREE.MathUtils.degToRad(-10);
        this.applyResponsiveModelLayout(object);

        const vertexShader = `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;

        const fragmentShader = `
          uniform vec3 accentA;
          uniform vec3 accentB;
          uniform float time;
          varying vec2 vUv;
          void main() {
            vec3 base = mix(accentA, accentB, clamp(vUv.y + 0.08 * sin(time + vUv.x * 6.2831), 0.0, 1.0));
            float shimmer = 0.82 + 0.18 * sin(time * 1.5 + vUv.y * 5.0);
            gl_FragColor = vec4(base * shimmer, 0.94);
          }
        `;

        this.shaderMaterial = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            accentA: { value: new THREE.Color(this.modeThemes[this.activeMode].accentA) },
            accentB: { value: new THREE.Color(this.modeThemes[this.activeMode].accentB) },
            time: { value: 0 }
          }
        });

        object.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.material = this.shaderMaterial!;

            const positionAttribute = child.geometry.getAttribute('position');
            const positionArray = positionAttribute.array as Float32Array;
            child.userData['originalPositions'] = new Float32Array(positionArray.length);
            child.userData['originalPositions'].set(positionArray);
          }
        });

        this.scene.add(object);
        this.syncSceneLayout();
        window.requestAnimationFrame(() => this.syncSceneLayout());
        this.loading = false;
        this.stopLoadingDotsAnimation();
      },
      undefined,
      () => {
        this.loading = false;
        this.stopLoadingDotsAnimation();
      }
    );
  }

  ngAfterViewInit() {
    this.syncSceneLayout();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.5;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.enabled = false;

    window.requestAnimationFrame(() => this.syncSceneLayout());
    this.animate();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.syncSceneLayout();
  }

  @HostListener('window:orientationchange')
  onOrientationChange() {
    window.setTimeout(() => {
      this.syncSceneLayout();
    }, 60);
  }

  setRendererSize() {
    if (!this.rendererContainer?.nativeElement) {
      return;
    }

    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    if (!width || !height) {
      return;
    }

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private applyResponsiveLayoutToSceneObject() {
    const object = this.scene.getObjectByName('myObject');
    if (object) {
      this.applyResponsiveModelLayout(object);
    }
  }

  private syncSceneLayout() {
    this.setRendererSize();
    this.applyResponsiveLayoutToSceneObject();
  }

  private applyResponsiveModelLayout(object: THREE.Object3D) {
    const containerWidth = this.rendererContainer?.nativeElement?.clientWidth || window.innerWidth;
    const containerHeight = this.rendererContainer?.nativeElement?.clientHeight || window.innerHeight;
    const fitRatio = Math.max(Math.min(containerWidth / 800, containerHeight / 800, 1), 0.34);
    const positionRatio = Math.max(Math.min(fitRatio * 1.08, 1), 0.4);
    const verticalRatio = Math.max(Math.min(fitRatio * 1.02, 1), 0.6);
    const scaleRatio = Math.max(Math.min(fitRatio * 1.16, 1), 0.38);

    object.position.set(
      this.desktopModelPosition.x * positionRatio,
      this.desktopModelPosition.y * verticalRatio,
      this.desktopModelPosition.z
    );
    object.scale.setScalar(this.desktopScale * scaleRatio);
  }

  animate() {
    if (!this.active) {
      return;
    }

    window.requestAnimationFrame(() => this.animate());
    this.frame += 0.05;
    this.updateSceneModeTransition();

    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms['time'].value = this.frame;
    }

    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        const positionAttribute = object.geometry.getAttribute('position');
        const positionArray = positionAttribute.array as Float32Array;
        const originalArray = object.userData['originalPositions'] as Float32Array | undefined;

        if (!originalArray) {
          return;
        }

        for (let i = 0; i < positionArray.length; i += 3) {
          const x = originalArray[i];
          const y = originalArray[i + 1];
          const z = originalArray[i + 2];
          const positionMultiplier = 0.2;

          positionArray[i] = x + Math.cos(this.frame + x) * positionMultiplier;
          positionArray[i + 1] = y + Math.sin(this.frame + y) * positionMultiplier;
          positionArray[i + 2] = z + Math.cos(this.frame + z) * positionMultiplier;
        }

        positionAttribute.needsUpdate = true;
      }
    });

    const targetPosition = new THREE.Vector3(0, 0, -1);
    const animationSpeed = 0.02;

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

    if (this.isRotatingUp) {
      this.rotateUpAnimation();
    } else {
      this.randomModelRotation();
    }

    if (!this.camera.position.equals(targetPosition)) {
      this.camera.lookAt(0, 0, 0);
    }

    if (this.camera.position.equals(targetPosition) && this.controls) {
      this.controls.enabled = true;
    }

    if (this.controls?.enabled) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  rotateUpAnimation() {
    const currentTime = performance.now();
    const object = this.scene.getObjectByName('myObject');

    if (this.isRotatingUp) {
      if (this.rotationUpStartTime === 0) {
        this.rotationUpStartTime = currentTime;
      }

      const elapsedTime = currentTime - this.rotationUpStartTime;
      const rotationFactor = elapsedTime / this.rotationUpDuration;

      if (object) {
        object.rotation.x = Math.PI / 2 * (1 - rotationFactor);
      }

      if (elapsedTime >= this.rotationUpDuration) {
        this.isRotatingUp = false;
        if (object) {
          object.rotation.x = 0;
        }
      }
    }
  }

  randomModelRotation() {
    const currentTime = performance.now();
    const object = this.scene.getObjectByName('myObject');

    if (object && this.originalRotation === 0) {
      this.originalRotation = object.rotation.y;
    }

    if (!this.rotating && currentTime - this.lastRotationTime > this.nextRotationDelay) {
      this.rotating = true;
      this.rotationStartTime = currentTime;
      this.lastRotationTime = currentTime;
      this.nextRotationDelay = (Math.random() * 9 + 1) * 1000;
      this.startRight = Math.random() < 0.5;
    }

    if (this.rotating) {
      const elapsedTime = currentTime - this.rotationStartTime;
      const rotationFactor = Math.sin((elapsedTime / this.rotationDuration) * Math.PI);
      const rotationAmplitude = Math.PI / 64;
      const directionMultiplier = this.startRight ? 1 : -1;

      if (object) {
        object.rotation.y = this.originalRotation + directionMultiplier * rotationAmplitude * rotationFactor;
      }

      if (elapsedTime >= this.rotationDuration) {
        this.rotating = false;
        if (object) {
          object.rotation.y = this.originalRotation;
        }
      }
    }
  }

  ngOnDestroy() {
    this.active = false;
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
    }
    if (this.loadingDotsIntervalId) {
      window.clearInterval(this.loadingDotsIntervalId);
    }
    this.renderer.dispose();

    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
        object.geometry.dispose();
      }
    });

    this.controls?.dispose();
  }
}
