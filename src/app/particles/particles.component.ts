import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

type ParticleMode = 'architecture' | 'agentic' | 'migration' | 'resilience' | 'tooling';
export type StageMode = 'home' | 'ventures' | 'labs' | 'anchorkeep' | 'greenlight' | 'lab-detail';

interface ModeTheme {
  accentA: number;
  accentB: number;
  keywords: string[];
}

interface AssemblePointCloud {
  mesh: THREE.Mesh;
  points: THREE.Points;
  startPositions: Float32Array;
  targetPositions: Float32Array;
  motionStartPositions: Float32Array;
}

type AvatarMotion = 'assembling' | 'bursting' | 'dispersed' | 'idle';

@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef<HTMLDivElement>;
  @Input() stageMode: StageMode = 'home';
  @Output() requestAccess = new EventEmitter<void>();
  @Output() responseStateChange = new EventEmitter<boolean>();
  private readonly anonymousResponseKey = 'dave2-anonymous-response-used';
  private readonly apiBaseUrl = environment.api.baseUrl.trim();
  private readonly apiGatewayKey = environment.api.gatewayKey.trim();

  renderer?: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  controls?: OrbitControls;
  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  pointLight = new THREE.PointLight(0xffffff, 1, 0, 2);
  frame = 0;
  active = true;
  question = '';
  isDisabled = false;
  activeResponseMarkdown = '';
  responseClosing = false;
  gateLocked = false;
  isAuthenticated = false;

  public myMessage = 'Dave 2.0 // online';
  public displayedMessage = '';
  private readonly speed = 50;
  private intervalId?: number;

  dotsIntervalId?: number;
  displayedDots = '';

  loading = false;
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
  private shellMaterial?: THREE.ShaderMaterial;
  private pointCloudMaterial?: THREE.PointsMaterial;
  private particleTexture?: THREE.CanvasTexture;
  private readonly currentAccentA = new THREE.Color();
  private readonly currentAccentB = new THREE.Color();
  private readonly targetAccentA = new THREE.Color();
  private readonly targetAccentB = new THREE.Color();
  private readonly colorTransitionFactor = 0.08;
  private readonly shellScale = 1.085;
  private readonly assembleDuration = 1700;
  private readonly reassembleDuration = 1050;
  private readonly burstDuration = 820;
  private readonly maxAssemblePointsPerMesh = 12000;
  private avatarMotion: AvatarMotion = 'idle';
  private avatarMotionStartTime = 0;
  private initialAssembly = true;
  private responseOpen = false;
  private responseCloseTimer?: number;
  private assemblePointClouds: AssemblePointCloud[] = [];

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
  private authSubscription?: Subscription;

  constructor(private http: HttpClient, private auth: AuthService) {
    this.scene.background = null;
    this.camera.position.set(0, 0, -1);

    this.pointLight.position.set(50, 50, 50);
    this.scene.add(this.ambientLight, this.pointLight);
    this.setInitialSceneMode(this.activeMode);
    this.authSubscription = this.auth.state$.subscribe((state) => {
      this.isAuthenticated = state.isAuthenticated;
      this.updateGateState();
    });
    this.updateGateState();

    this.startTyping(this.myMessage);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['stageMode']) {
      const nextMode = this.getParticleModeForStage(this.stageMode);
      this.activeMode = nextMode;
      this.queueSceneModeTransition(nextMode);

      if (!changes['stageMode'].firstChange && this.responseOpen) {
        if (this.responseCloseTimer) {
          window.clearTimeout(this.responseCloseTimer);
          this.responseCloseTimer = undefined;
        }
        this.activeResponseMarkdown = '';
        this.responseClosing = false;
        this.responseOpen = false;
        this.responseStateChange.emit(false);
      }

      this.applyAvatarTargetState();
    }
  }

  getData(question: string) {
    if (!this.apiBaseUrl) {
      this.stopDotsAnimation();
      this.completeAnswer('The brain endpoint is not configured.');
      return;
    }

    const body = {
      question
    };
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (this.apiGatewayKey) {
      headers = headers.set('x-api-key', this.apiGatewayKey);
    }

    this.http.post(this.apiBaseUrl, body, { headers, responseType: 'text' }).subscribe({
      next: (response) => {
        const message = this.getResponseText(response);
        this.stopDotsAnimation();
        this.completeAnswer(message);
      },
      error: (error) => {
        const fallbackMessage = this.getErrorText(error);
        this.stopDotsAnimation();
        console.error(error);
        this.completeAnswer(fallbackMessage);
      }
    });
  }

  async askQuestion() {
    const prompt = this.question.trim();
    if (!prompt) {
      return;
    }

    if (this.gateLocked) {
      this.activeResponseMarkdown = '';
      this.displayedMessage = '';
      return;
    }

    this.activeResponseMarkdown = '';
    this.setModeForPrompt(prompt);
    this.isDisabled = true;
    this.displayedMessage = 'Thinking';
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

  private getResponseText(response: unknown): string {
    if (typeof response === 'string') {
      const trimmed = response.trim();
      if (!trimmed) {
        return 'No response returned.';
      }

      if (this.looksLikeJson(trimmed)) {
        try {
          return this.getResponseText(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }

      return trimmed;
    }

    if (!response || typeof response !== 'object') {
      return 'No response returned.';
    }

    const record = response as Record<string, unknown>;
    for (const key of ['answer', 'message', 'response', 'text']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    const body = record['body'];
    if (typeof body === 'string' && body.trim()) {
      try {
        return this.getResponseText(JSON.parse(body));
      } catch {
        return body.trim();
      }
    }

    if (body && typeof body === 'object') {
      return this.getResponseText(body);
    }

    return JSON.stringify(response, null, 2);
  }

  private getErrorText(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = this.getResponseText(error.error);
      if (backendMessage !== 'No response returned.') {
        return backendMessage;
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
      }

      if (error.status) {
        return `Request failed with status ${error.status}.`;
      }
    }

    return 'Dave 2.0 is unavailable right now. Please try again shortly.';
  }

  private looksLikeJson(value: string): boolean {
    return (value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'));
  }

  private completeAnswer(message: string) {
    this.activeResponseMarkdown = message;
    this.displayedMessage = '';
    this.isDisabled = false;
    this.setResponseSurface(true);
    if (!this.isAuthenticated) {
      this.markAnonymousResponseUsed();
      this.updateGateState();
    }
  }

  closeResponse() {
    if (this.responseClosing) {
      return;
    }

    this.responseClosing = true;
    this.responseCloseTimer = window.setTimeout(() => {
      this.activeResponseMarkdown = '';
      this.responseClosing = false;
      this.responseCloseTimer = undefined;
      this.setResponseSurface(false);
    }, 280);
  }

  private setResponseSurface(open: boolean) {
    if (this.responseOpen === open) {
      return;
    }

    this.responseOpen = open;
    this.responseStateChange.emit(open);
    this.applyAvatarTargetState();
  }

  private updateGateState() {
    this.gateLocked = !this.isAuthenticated && this.hasAnonymousResponseBeenUsed();
  }

  private hasAnonymousResponseBeenUsed() {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(this.anonymousResponseKey) === '1';
  }

  private markAnonymousResponseUsed() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.anonymousResponseKey, '1');
  }

  private detectModeFromPrompt(prompt: string) {
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

    return nextMode;
  }

  private setModeForPrompt(prompt: string) {
    const nextMode = this.detectModeFromPrompt(prompt);
    this.activeMode = nextMode;
    this.queueSceneModeTransition(nextMode);
  }

  private getParticleModeForStage(stageMode: StageMode): ParticleMode {
    switch (stageMode) {
      case 'ventures':
        return 'agentic';
      case 'labs':
        return 'tooling';
      case 'anchorkeep':
        return 'resilience';
      case 'greenlight':
        return 'agentic';
      case 'lab-detail':
        return 'architecture';
      default:
        return 'architecture';
    }
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

    if (this.shellMaterial) {
      this.shellMaterial.uniforms['accentA'].value.copy(this.currentAccentA);
      this.shellMaterial.uniforms['accentB'].value.copy(this.currentAccentB);
      this.shellMaterial.uniforms['time'].value = this.frame;
    }

    if (this.pointCloudMaterial) {
      this.pointCloudMaterial.color.copy(this.currentAccentA).lerp(this.currentAccentB, 0.45);
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

  private scheduleModelLoad() {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (this.active) {
          this.loadAvatarModel();
        }
      }, 120);
    });
  }

  loadAvatarModel = () => {
    this.loading = true;
    this.startLoadingDotsAnimation();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/gltf/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      'assets/dave.glb',
      (gltf) => {
        const avatarRoot = new THREE.Group();
        const coreObject = gltf.scene;
        const shellObject = gltf.scene.clone(true);

        avatarRoot.name = 'myObject';
        avatarRoot.rotation.z = THREE.MathUtils.degToRad(90);
        avatarRoot.rotation.y = THREE.MathUtils.degToRad(-10);
        avatarRoot.rotation.x = THREE.MathUtils.degToRad(-10);
        this.applyResponsiveModelLayout(avatarRoot);

        this.shaderMaterial = this.createCoreMaterial();
        this.shellMaterial = this.createShellMaterial();

        coreObject.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.material = this.shaderMaterial!;

            const positionAttribute = child.geometry.getAttribute('position');
            const positionArray = positionAttribute.array as Float32Array;
            child.userData['originalPositions'] = new Float32Array(positionArray.length);
            child.userData['originalPositions'].set(positionArray);
            child.renderOrder = 1;
          }
        });

        shellObject.scale.setScalar(this.shellScale);
        shellObject.name = 'myShellObject';
        shellObject.visible = false;
        shellObject.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.material = this.shellMaterial!;
            child.userData['skipDeform'] = true;
            child.renderOrder = 2;
          }
        });

        avatarRoot.add(coreObject);
        avatarRoot.add(shellObject);
        this.createAssemblePointClouds(coreObject);
        this.scene.add(avatarRoot);
        this.syncSceneLayout();
        window.requestAnimationFrame(() => this.syncSceneLayout());
        this.loading = false;
        this.stopLoadingDotsAnimation();
        dracoLoader.dispose();
      },
      undefined,
      () => {
        this.loading = false;
        this.stopLoadingDotsAnimation();
        dracoLoader.dispose();
      }
    );
  }

  private createCoreMaterial() {
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

    return new THREE.ShaderMaterial({
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
  }

  private createShellMaterial() {
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vLocalPosition;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewPosition = -mvPosition.xyz;
        vLocalPosition = position;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform vec3 accentA;
      uniform vec3 accentB;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vLocalPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - clamp(abs(dot(normal, viewDir)), 0.0, 1.0), 1.35);
        float scan = 0.72 + 0.28 * sin(vLocalPosition.y * 10.0 + time * 2.6);
        float pulse = 0.82 + 0.18 * sin(time * 1.8);
        vec3 glow = mix(accentA, accentB, 0.5 + 0.5 * sin(time * 0.9 + vLocalPosition.y * 3.0));
        vec3 highlight = mix(glow, vec3(0.92, 1.0, 1.0), 0.35 + fresnel * 0.35);
        float alpha = clamp((0.12 + fresnel * 0.78) * scan * pulse, 0.0, 0.9);
        gl_FragColor = vec4(highlight * (0.75 + fresnel * 1.2), alpha);
      }
    `;

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        accentA: { value: new THREE.Color(this.modeThemes[this.activeMode].accentA) },
        accentB: { value: new THREE.Color(this.modeThemes[this.activeMode].accentB) },
        time: { value: 0 }
      }
    });
  }

  private createAssemblePointClouds(coreObject: THREE.Object3D) {
    this.particleTexture = this.createParticleTexture();
    this.pointCloudMaterial = new THREE.PointsMaterial({
      size: 1.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
      map: this.particleTexture,
      alphaTest: 0.02,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      color: this.currentAccentA.clone().lerp(this.currentAccentB, 0.45)
    });

    coreObject.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const positionAttribute = child.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!positionAttribute || positionAttribute.count === 0) {
        return;
      }

      const normalAttribute = child.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
      const vertexStep = Math.max(1, Math.ceil(positionAttribute.count / this.maxAssemblePointsPerMesh));
      const sampleCount = Math.ceil(positionAttribute.count / vertexStep);
      const targetPositions = new Float32Array(sampleCount * 3);
      const startPositions = new Float32Array(sampleCount * 3);
      let writeIndex = 0;

      for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex += vertexStep) {
        const x = positionAttribute.getX(vertexIndex);
        const y = positionAttribute.getY(vertexIndex);
        const z = positionAttribute.getZ(vertexIndex);
        const targetOffset = writeIndex * 3;

        targetPositions[targetOffset] = x;
        targetPositions[targetOffset + 1] = y;
        targetPositions[targetOffset + 2] = z;

        let directionX = Math.random() * 2 - 1;
        let directionY = Math.random() * 2 - 1;
        let directionZ = Math.random() * 2 - 1;

        if (normalAttribute && vertexIndex < normalAttribute.count) {
          directionX = normalAttribute.getX(vertexIndex);
          directionY = normalAttribute.getY(vertexIndex);
          directionZ = normalAttribute.getZ(vertexIndex);
        }

        const direction = new THREE.Vector3(directionX, directionY, directionZ);
        if (direction.lengthSq() < 0.0001) {
          direction.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
        }

        direction.normalize();

        const explodeDistance = 14 + Math.random() * 24;
        const driftX = (Math.random() * 2 - 1) * 8;
        const driftY = (Math.random() * 2 - 1) * 10;
        const driftZ = (Math.random() * 2 - 1) * 8;

        startPositions[targetOffset] = x + direction.x * explodeDistance + driftX;
        startPositions[targetOffset + 1] = y + direction.y * explodeDistance + driftY;
        startPositions[targetOffset + 2] = z + direction.z * explodeDistance + driftZ;
        writeIndex += 1;
      }

      const pointsGeometry = new THREE.BufferGeometry();
      pointsGeometry.setAttribute('position', new THREE.BufferAttribute(startPositions.slice(), 3));

      const points = new THREE.Points(pointsGeometry, this.pointCloudMaterial!);
      points.position.copy(child.position);
      points.quaternion.copy(child.quaternion);
      points.scale.copy(child.scale);
      points.renderOrder = 3;
      points.frustumCulled = false;
      child.parent?.add(points);

      child.visible = false;
      this.assemblePointClouds.push({
        mesh: child,
        points,
        startPositions,
        targetPositions,
        motionStartPositions: startPositions.slice()
      });
    });

    if (this.assemblePointClouds.length > 0) {
      if (this.shouldShowAvatar()) {
        this.avatarMotion = 'assembling';
        this.avatarMotionStartTime = performance.now();
      } else {
        this.avatarMotion = 'dispersed';
        this.pointCloudMaterial.opacity = 0.12;
      }
    } else {
      this.pointCloudMaterial?.dispose();
      this.pointCloudMaterial = undefined;
    }
  }

  private createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    if (!context) {
      return undefined;
    }

    const glow = context.createRadialGradient(32, 32, 4, 32, 32, 31);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.35, 'rgba(255, 255, 255, 0.92)');
    glow.addColorStop(0.72, 'rgba(255, 255, 255, 0.34)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private applyAvatarTargetState() {
    if (!this.assemblePointClouds.length) {
      return;
    }

    if (this.shouldShowAvatar()) {
      if (this.avatarMotion !== 'idle' && this.avatarMotion !== 'assembling') {
        this.beginAvatarMotion('assembling');
      }
      return;
    }

    if (this.avatarMotion !== 'dispersed' && this.avatarMotion !== 'bursting') {
      this.beginAvatarMotion('bursting');
    }
  }

  private shouldShowAvatar() {
    return this.stageMode === 'home' && !this.responseOpen;
  }

  private beginAvatarMotion(motion: 'assembling' | 'bursting') {
    const shellObject = this.scene.getObjectByName('myShellObject');
    if (shellObject) {
      shellObject.visible = false;
    }

    this.assemblePointClouds.forEach((entry) => {
      const positionAttribute = entry.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const livePositions = positionAttribute.array as Float32Array;

      if (this.avatarMotion === 'idle') {
        livePositions.set(entry.targetPositions);
      }

      entry.motionStartPositions = livePositions.slice();
      positionAttribute.needsUpdate = true;
      entry.mesh.visible = false;
      entry.points.visible = true;
    });

    this.avatarMotion = motion;
    this.avatarMotionStartTime = performance.now();
    this.initialAssembly = false;

    if (this.pointCloudMaterial) {
      this.pointCloudMaterial.opacity = 0.96;
    }
  }

  private updateAvatarPointClouds() {
    if (this.avatarMotion !== 'assembling' && this.avatarMotion !== 'bursting') {
      if (this.avatarMotion === 'dispersed' && this.pointCloudMaterial) {
        this.pointCloudMaterial.opacity = 0.11 + Math.sin(this.frame * 0.65) * 0.025;
      }
      return;
    }

    const duration = this.avatarMotion === 'bursting'
      ? this.burstDuration
      : (this.initialAssembly ? this.assembleDuration : this.reassembleDuration);
    const elapsed = performance.now() - this.avatarMotionStartTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = this.avatarMotion === 'bursting'
      ? 1 - Math.pow(1 - progress, 4)
      : 1 - Math.pow(1 - progress, 3);

    if (this.pointCloudMaterial) {
      this.pointCloudMaterial.opacity = this.avatarMotion === 'bursting'
        ? Math.max(0.12, 0.96 - easedProgress * 0.84)
        : Math.max(0.16, 0.96 - easedProgress * 0.76);
    }

    this.assemblePointClouds.forEach((entry) => {
      const positionAttribute = entry.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const livePositions = positionAttribute.array as Float32Array;
      const destination = this.avatarMotion === 'bursting' ? entry.startPositions : entry.targetPositions;

      for (let index = 0; index < livePositions.length; index += 1) {
        const start = entry.motionStartPositions[index];
        const target = destination[index];
        livePositions[index] = start + (target - start) * easedProgress;
      }

      positionAttribute.needsUpdate = true;
    });

    if (progress >= 1) {
      if (this.avatarMotion === 'bursting') {
        this.finishAvatarBurst();
      } else {
        this.finishAssemblePointClouds();
      }
    }
  }

  private finishAssemblePointClouds() {
    this.avatarMotion = 'idle';
    this.initialAssembly = false;
    this.assemblePointClouds.forEach((entry) => {
      entry.mesh.visible = true;
      entry.points.visible = false;
    });

    const shellObject = this.scene.getObjectByName('myShellObject');
    if (shellObject) {
      shellObject.visible = true;
    }
  }

  private finishAvatarBurst() {
    this.avatarMotion = 'dispersed';
    if (this.pointCloudMaterial) {
      this.pointCloudMaterial.opacity = 0.12;
    }
  }

  ngAfterViewInit() {
    try {
      this.renderer = this.createRenderer();
    } catch (error) {
      console.warn('The interactive avatar is unavailable because WebGL could not be initialized.', error);
      return;
    }

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
    this.scheduleModelLoad();
    this.animate();
  }

  private createRenderer() {
    return new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
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
    if (!this.renderer || !this.rendererContainer?.nativeElement) {
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
    if (!this.active || !this.renderer) {
      return;
    }

    window.requestAnimationFrame(() => this.animate());
    this.frame += 0.05;
    this.updateSceneModeTransition();

    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms['time'].value = this.frame;
    }

    if (this.shellMaterial) {
      this.shellMaterial.uniforms['time'].value = this.frame;
    }

    this.updateAvatarPointClouds();

    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        if (object.userData['skipDeform'] || !object.visible) {
          return;
        }

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
    this.authSubscription?.unsubscribe();
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
    }
    if (this.loadingDotsIntervalId) {
      window.clearInterval(this.loadingDotsIntervalId);
    }
    if (this.responseCloseTimer) {
      window.clearTimeout(this.responseCloseTimer);
    }
    this.renderer?.dispose();
    this.shaderMaterial?.dispose();
    this.shellMaterial?.dispose();
    this.pointCloudMaterial?.dispose();
    this.particleTexture?.dispose();
    this.assemblePointClouds.forEach((entry) => {
      entry.points.geometry.dispose();
    });

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
