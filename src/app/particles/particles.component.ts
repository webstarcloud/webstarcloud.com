import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ErrorReportingService } from '../core/error-reporting.service';

interface ResponsePreset {
  keywords: string[];
  response: string;
}

@Component({
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef<HTMLDivElement>;

  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  model: THREE.Object3D | null = null;
  modelRoot?: THREE.Object3D;
  modelSize?: THREE.Vector3;
  active = true;
  frameId?: number;

  question = '';
  isDisabled = false;
  displayedMessage = '';
  displayedDots = '';

  loading = true;
  loadingDots = '';
  webglSupported = true;
  errorMessage = '';
  fallbackVisible = false;

  private typingIntervalId?: number;
  private dotsIntervalId?: number;
  private loadingDotsIntervalId?: number;
  private intersectionObserver?: IntersectionObserver;
  private hasLoadedModel = false;
  private readonly typingSpeed = 24;
  private readonly reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private readonly modelBaseX = 0;
  private readonly modelBaseY = 20;
  private readonly modelFill = 40;
  private readonly jitterRotation = new THREE.Vector3(0.006, 0.02, 0.004);
  private readonly jitterPosition = new THREE.Vector3(0.08, 0.004, 0);

  private readonly responsePresets: ResponsePreset[] = [
    {
      keywords: ['holodeck', 'simulation', 'rehearsal'],
      response: 'Holodeck is an R&D sandbox for rehearsing irreversible migrations under production constraints.'
    },
    {
      keywords: ['radar', 'drift', 'anomaly'],
      response: 'Radar fuses weak signals across systems to surface drift before it becomes an outage.'
    },
    {
      keywords: ['homomorphic', 'secure computation', 'encryption'],
      response: 'I build systems that keep data encrypted while it is processed, so privacy is a runtime guarantee.'
    },
    {
      keywords: ['tmnl', 'platform rebuild', 'migration'],
      response: 'The TMNL rebuild focused on parallel-validated compute to avoid irreversible cutovers without truth tables.'
    },
    {
      keywords: ['agentic', 'agents', 'guardrail'],
      response: 'Agentic systems need containment layers that define blast radius and escalation boundaries.'
    },
    {
      keywords: ['architecture', 'systems', 'primitives'],
      response: 'My work centers on primitives: the smallest durable abstractions that keep systems safe at scale.'
    }
  ];

  private readonly allowedKeywords = [
    'holodeck',
    'radar',
    'invariant',
    'failsafe',
    'agentic',
    'agents',
    'architecture',
    'systems',
    'primitives',
    'cloud',
    'distributed',
    'secure',
    'homomorphic',
    'encryption',
    'tmnl',
    'rebuild',
    'migration',
    'platform'
  ];

  private readonly guardrailResponse =
    'Scope is limited to systems, architecture, and active R&D. Ask about Holodeck, Radar, homomorphic systems, or rebuild strategy.';

  private readonly defaultResponse =
    'I can answer about projects, architectural rationale, and R&D primitives. Try a specific system or constraint.';

  constructor(private errorReporter: ErrorReportingService) {
    this.scene.background = null;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power'
    });

    this.camera.position.set(0, 0, 6);

    const ambientLight = new THREE.AmbientLight(0x9a8bff, 0.9);
    const keyLight = new THREE.DirectionalLight(0x6f5bff, 0.8);
    keyLight.position.set(4, 6, 8);
    const rimLight = new THREE.DirectionalLight(0x5a3dff, 0.4);
    rimLight.position.set(-6, 2, -4);

    this.scene.add(ambientLight, keyLight, rimLight);
  }

  ngAfterViewInit() {
    try {
      if (!this.isWebGLAvailable()) {
        this.webglSupported = false;
        this.loading = false;
        this.fallbackVisible = true;
        this.errorMessage = 'WebGL unavailable. Showing fallback.';
        return;
      }

      this.setRendererSize();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting) && !this.hasLoadedModel) {
            this.hasLoadedModel = true;
            this.loadOBJModel();
            this.intersectionObserver?.disconnect();
          }
        });
        this.intersectionObserver.observe(this.rendererContainer.nativeElement);
      } else {
        this.hasLoadedModel = true;
        this.loadOBJModel();
      }

      if (this.reducedMotion) {
        this.renderOnce();
      } else {
        this.animate();
      }
    } catch (error) {
      this.errorReporter.report({ context: 'avatar-render', error });
      this.webglSupported = false;
      this.loading = false;
      this.fallbackVisible = true;
      this.errorMessage = 'WebGL is unavailable in this environment.';
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.setRendererSize();
    if (this.modelRoot && this.modelSize) {
      this.applyScaleToModel(this.modelRoot, this.modelSize);
    }
  }

  askQuestion() {
    const prompt = this.question.trim();
    if (!prompt) {
      this.startTyping('Ask about a system, constraint, or R&D artifact.');
      return;
    }

    this.isDisabled = true;
    this.displayedMessage = 'Synthesizing';
    this.startDotsAnimation();

    this.generateResponse(prompt)
      .then((response) => {
        this.stopDotsAnimation();
        this.startTyping(response);
      })
      .catch((error) => {
        this.errorReporter.report({ context: 'interface-response', error });
        this.stopDotsAnimation();
        this.startTyping('Interface unavailable. Use the About page to connect.');
      });
  }

  private async generateResponse(prompt: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const normalized = prompt.toLowerCase();

    if (!this.allowedKeywords.some((keyword) => normalized.includes(keyword))) {
      return this.guardrailResponse;
    }

    const preset = this.responsePresets.find((entry) =>
      entry.keywords.some((keyword) => normalized.includes(keyword))
    );

    return preset ? preset.response : this.defaultResponse;
  }

  private startDotsAnimation() {
    this.displayedDots = '';
    this.dotsIntervalId = window.setInterval(() => {
      this.displayedDots = this.displayedDots.length >= 3 ? '' : `${this.displayedDots}.`;
    }, 450);
  }

  private stopDotsAnimation() {
    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
      this.dotsIntervalId = undefined;
    }
    this.displayedDots = '';
  }

  private startTyping(message: string) {
    if (this.typingIntervalId) {
      window.clearInterval(this.typingIntervalId);
    }

    let index = 0;
    this.displayedMessage = '';
    this.typingIntervalId = window.setInterval(() => {
      if (index < message.length) {
        this.displayedMessage += message[index];
        index += 1;
      } else {
        if (this.typingIntervalId) {
          window.clearInterval(this.typingIntervalId);
          this.typingIntervalId = undefined;
        }
        this.isDisabled = false;
      }
    }, this.typingSpeed);
  }

  private startLoadingDotsAnimation() {
    let dotCount = 0;
    this.loadingDots = '';
    this.loadingDotsIntervalId = window.setInterval(() => {
      this.loadingDots = `${'.'.repeat(dotCount)}`;
      dotCount = dotCount >= 3 ? 0 : dotCount + 1;
    }, 500);
  }

  private stopLoadingDotsAnimation() {
    if (this.loadingDotsIntervalId) {
      window.clearInterval(this.loadingDotsIntervalId);
      this.loadingDotsIntervalId = undefined;
    }
    this.loadingDots = '';
  }

  private loadOBJModel() {
    this.startLoadingDotsAnimation();
    const loader = new OBJLoader();

    loader.load(
      'assets/me.obj',
      (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());

        object.position.sub(center);
        object.rotation.set(0, Math.PI, Math.PI / 2);
        object.updateMatrixWorld(true);

        const rotatedBox = new THREE.Box3().setFromObject(object);
        const size = rotatedBox.getSize(new THREE.Vector3());
        this.modelRoot = object;
        this.modelSize = size;
        this.applyScaleToModel(object, size);

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x6f5bff),
          roughness: 0.35,
          metalness: 0.4,
          transparent: true,
          opacity: 0.85
        });

        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
          }
        });

        const group = new THREE.Group();
        group.add(object);
        group.position.set(this.modelBaseX, this.modelBaseY, 0);

        this.model = group;
        this.scene.add(group);
        this.loading = false;
        this.stopLoadingDotsAnimation();
        if (this.reducedMotion) {
          this.renderOnce();
        }
      },
      undefined,
      (error) => {
        this.errorReporter.report({ context: 'avatar-model', error });
        this.buildFallbackModel();
      }
    );
  }

  private buildFallbackModel() {
    const geometry = new THREE.IcosahedronGeometry(1.6, 1);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x6f5bff),
      wireframe: true,
      transparent: true,
      opacity: 0.7
    });

    this.model = new THREE.Mesh(geometry, material);
    this.scene.add(this.model);
    this.loading = false;
    this.stopLoadingDotsAnimation();
    this.errorMessage = 'Loaded fallback avatar.';
    if (this.reducedMotion) {
      this.renderOnce();
    }
  }

  private setRendererSize() {
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

  private applyScaleToModel(object: THREE.Object3D, size: THREE.Vector3) {
    this.setRendererSize();
    const viewHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.position.z;
    const viewWidth = viewHeight * this.camera.aspect;
    const baseScale = Math.min(
      viewWidth / (size.x || 1),
      viewHeight / (size.y || 1)
    );
    object.scale.setScalar(baseScale * this.modelFill);
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }

  private renderOnce() {
    this.renderer.render(this.scene, this.camera);
  }

  private animate() {
    if (!this.active) {
      return;
    }

    this.frameId = window.requestAnimationFrame(() => this.animate());

    if (this.model) {
      const time = performance.now() * 0.001;
      const jitterX = Math.sin(time * 0.6) * this.jitterRotation.x;
      const jitterY = Math.cos(time * 0.5) * this.jitterRotation.y;
      const jitterZ = Math.sin(time * 0.4) * this.jitterRotation.z;

      const bobX = Math.sin(time * 0.7) * this.jitterPosition.x;
      const bobY = Math.cos(time * 0.9) * this.jitterPosition.y;
      const bobZ = Math.sin(time * 0.3) * this.jitterPosition.z;

      this.model.position.set(
        this.modelBaseX + bobX,
        this.modelBaseY + bobY,
        bobZ
      );
      this.model.rotation.set(jitterX, jitterY, jitterZ);
    }

    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    this.active = false;

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
    }

    if (this.typingIntervalId) {
      window.clearInterval(this.typingIntervalId);
    }

    if (this.dotsIntervalId) {
      window.clearInterval(this.dotsIntervalId);
    }

    if (this.loadingDotsIntervalId) {
      window.clearInterval(this.loadingDotsIntervalId);
    }

    this.renderer.dispose();

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
