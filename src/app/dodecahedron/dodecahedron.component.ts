import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-dodecahedron',
  templateUrl: './dodecahedron.component.html',
  styleUrls: ['./dodecahedron.component.css']
})
export class DodecahedronComponent implements OnInit, AfterViewInit {

  @ViewChild('rendererContainer') rendererContainer!: ElementRef;

  renderer = new THREE.WebGLRenderer();
  scene;
  camera;
  mesh;
  active: boolean = true;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6f2da8);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);  // Set aspect ratio to 1 for now
    this.camera.position.z = 5;

    const geometry = new THREE.DodecahedronGeometry(1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    this.mesh = new THREE.Mesh(geometry, material);

    this.scene.add(this.mesh);
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.updateRendererSize();
    this.animate();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateRendererSize();
  }

  updateRendererSize() {
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
  }

  animate() {
    if (!this.active) return;

    window.requestAnimationFrame(() => this.animate());
    this.mesh.rotation.x += 0.005;
    this.mesh.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    this.active = false;
    this.renderer.dispose();  // Disposes the WebGL context

    this.mesh.material.dispose();  // Disposes the material
    this.mesh.geometry.dispose();  // Disposes the geometry
  }
}