import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface AssemblyCloud {
  readonly mesh: THREE.Mesh;
  readonly points: THREE.Points;
  readonly start: Float32Array;
  readonly target: Float32Array;
}

/** Isolated presentation of the original profile asset and hologram animation. */
export class PortraitScene {
  private readonly renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  private readonly avatar = new THREE.Group();
  private readonly clouds: AssemblyCloud[] = [];
  private readonly coreMaterial = this.createMaterial(false);
  private readonly shellMaterial = this.createMaterial(true);
  private readonly pointsMaterial = new THREE.PointsMaterial({
    size: 0.18, transparent: true, opacity: 0.92, depthWrite: false,
    depthTest: false, blending: THREE.AdditiveBlending, color: 0x78b7ff,
  });
  private shell?: THREE.Object3D;
  private bounds?: THREE.Vector3;
  private disposed = false;
  private assembled = false;
  private nextTurn = 2;
  private turnStart?: number;
  private turnDirection = 1;

  constructor(private readonly container: HTMLDivElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);
    this.avatar.rotation.set(0, THREE.MathUtils.degToRad(-10), Math.PI / 2);
    this.scene.add(this.avatar);
  }

  async load(): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync('/assets/dave.glb');
    if (this.disposed) {
      this.disposeObjects(gltf.scene);
      return;
    }
    const core = gltf.scene;
    this.shell = core.clone(true);
    this.shell.scale.setScalar(1.085);
    this.shell.visible = false;
    const originalMaterials = new Set<THREE.Material>();
    const meshes: THREE.Mesh[] = [];
    core.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      // The exported modelling cube is not part of the portrait.
      if (object.name === 'Cube') object.visible = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => originalMaterials.add(material));
      object.material = this.coreMaterial;
      object.renderOrder = 1;
      if (object.visible) meshes.push(object);
    });
    this.shell.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name === 'Cube') object.visible = false;
      object.material = this.shellMaterial;
      object.renderOrder = 2;
    });
    originalMaterials.forEach(material => material.dispose());
    this.avatar.add(core, this.shell);
    const bounds = new THREE.Box3().setFromObject(core.getObjectByName('me') ?? core);
    this.avatar.position.sub(bounds.getCenter(new THREE.Vector3()));
    this.bounds = bounds.getSize(new THREE.Vector3());
    meshes.forEach(mesh => this.createAssemblyCloud(mesh));
    this.resize();
  }

  resize(): void {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    if (this.bounds) {
      const halfField = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const distance = Math.max(this.bounds.y, this.bounds.x / this.camera.aspect) / (2 * halfField);
      this.camera.position.set(0, 0, -(distance * 1.12 + this.bounds.z / 2));
      this.camera.lookAt(0, 0, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  render(elapsed: number, still: boolean): void {
    if (this.disposed) return;
    const time = still ? 0 : elapsed * 3;
    for (const material of [this.coreMaterial, this.shellMaterial]) {
      material.uniforms['time'].value = time;
      material.uniforms['deform'].value = still ? 0 : 1;
    }
    if (!this.assembled) this.assemble(still ? 1 : Math.min(elapsed / 1.7, 1));
    this.avatar.rotation.y = THREE.MathUtils.degToRad(-10);
    if (!still && elapsed >= this.nextTurn) {
      this.turnStart ??= elapsed;
      const progress = elapsed - this.turnStart;
      this.avatar.rotation.y += this.turnDirection * (Math.PI / 64) * Math.sin(Math.min(progress, 1) * Math.PI);
      if (progress >= 1) {
        this.turnStart = undefined;
        this.nextTurn = elapsed + 1 + Math.random() * 9;
        this.turnDirection = Math.random() < 0.5 ? 1 : -1;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  private createAssemblyCloud(mesh: THREE.Mesh): void {
    const positions = mesh.geometry.getAttribute('position');
    const normals = mesh.geometry.getAttribute('normal');
    const step = Math.max(1, Math.ceil(positions.count / 12000));
    const target = new Float32Array(Math.ceil(positions.count / step) * 3);
    const start = new Float32Array(target.length);
    for (let index = 0, write = 0; index < positions.count; index += step, write += 3) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, index);
      const direction = normals
        ? new THREE.Vector3().fromBufferAttribute(normals, index)
        : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      if (direction.lengthSq() < 0.0001) direction.set(1, 0, 0);
      target.set([point.x, point.y, point.z], write);
      point.addScaledVector(direction.normalize(), 14 + Math.random() * 24);
      start.set([
        point.x + (Math.random() * 2 - 1) * 8,
        point.y + (Math.random() * 2 - 1) * 10,
        point.z + (Math.random() * 2 - 1) * 8,
      ], write);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(start.slice(), 3));
    const points = new THREE.Points(geometry, this.pointsMaterial);
    points.position.copy(mesh.position);
    points.quaternion.copy(mesh.quaternion);
    points.scale.copy(mesh.scale);
    points.frustumCulled = false;
    points.renderOrder = 3;
    mesh.parent?.add(points);
    mesh.visible = false;
    this.clouds.push({ mesh, points, start, target });
  }

  private assemble(progress: number): void {
    const eased = 1 - Math.pow(1 - progress, 3);
    this.pointsMaterial.opacity = Math.max(0.16, 0.96 - eased * 0.76);
    for (const cloud of this.clouds) {
      const position = cloud.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const live = position.array as Float32Array;
      for (let index = 0; index < live.length; index++) {
        live[index] = cloud.start[index] + (cloud.target[index] - cloud.start[index]) * eased;
      }
      position.needsUpdate = true;
      if (progress >= 1) {
        cloud.mesh.visible = true;
        cloud.points.visible = false;
      }
    }
    if (progress >= 1) {
      this.assembled = true;
      if (this.shell) this.shell.visible = true;
    }
  }

  private createMaterial(shell: boolean): THREE.ShaderMaterial {
    // Original profile shaders; vertex motion moves to the GPU instead of rewriting every vertex.
    const vertexShader = `
      uniform float time;
      uniform float deform;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vLocalPosition;
      void main() {
        vec3 animated = position + deform * 0.2 * vec3(cos(time + position.x), sin(time + position.y), cos(time + position.z));
        vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vViewPosition = -mvPosition.xyz;
        vLocalPosition = animated;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const fragmentShader = shell ? `
      uniform vec3 accentA; uniform vec3 accentB; uniform float time;
      varying vec3 vNormal; varying vec3 vViewPosition; varying vec3 vLocalPosition;
      void main() {
        float fresnel = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 1.35);
        float scan = 0.72 + 0.28 * sin(vLocalPosition.y * 10.0 + time * 2.6);
        float pulse = 0.82 + 0.18 * sin(time * 1.8);
        vec3 glow = mix(accentA, accentB, 0.5 + 0.5 * sin(time * 0.9 + vLocalPosition.y * 3.0));
        vec3 highlight = mix(glow, vec3(0.92, 1.0, 1.0), 0.35 + fresnel * 0.35);
        float alpha = clamp((0.12 + fresnel * 0.78) * scan * pulse, 0.0, 0.9);
        gl_FragColor = vec4(highlight * (0.75 + fresnel * 1.2), alpha);
      }
    ` : `
      uniform vec3 accentA; uniform vec3 accentB; uniform float time; varying vec2 vUv;
      void main() {
        vec3 base = mix(accentA, accentB, clamp(vUv.y + 0.08 * sin(time + vUv.x * 6.2831), 0.0, 1.0));
        float shimmer = 0.82 + 0.18 * sin(time * 1.5 + vUv.y * 5.0);
        gl_FragColor = vec4(base * shimmer, 0.94);
      }
    `;
    return new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false,
      depthTest: !shell, side: shell ? THREE.DoubleSide : THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      uniforms: { accentA: { value: new THREE.Color(0x66d6ff) }, accentB: { value: new THREE.Color(0x8d90ff) },
        time: { value: 0 }, deform: { value: 1 } },
    });
  }

  private disposeObjects(root: THREE.Object3D, disposeMaterials = true): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;
      geometries.add(object.geometry);
      const entries = Array.isArray(object.material) ? object.material : [object.material];
      entries.forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    if (disposeMaterials) materials.forEach(material => material.dispose());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeObjects(this.scene, false);
    this.coreMaterial.dispose();
    this.shellMaterial.dispose();
    this.pointsMaterial.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.clouds.length = 0;
    this.scene.clear();
  }
}
