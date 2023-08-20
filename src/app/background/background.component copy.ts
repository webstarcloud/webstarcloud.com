import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-background',
  template: '<div #rendererContainer></div>',
  styleUrls: ['./background.component.css']
})
export class BackgroundComponent implements OnInit, AfterViewInit {

  @ViewChild('rendererContainer') rendererContainer!: ElementRef;

  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  particles: THREE.Points;
  lines: THREE.LineSegments;

  constructor() {
    this.camera.position.z = 10;

    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({ color: 0xffffff });

    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

    const vertices = [];
    const indices = [];

    for (let i = 0; i < 100; i++) {
      // Create a random position for the particle
      const x = Math.random() * 10 - 5;
      const y = Math.random() * 10 - 5;
      const z = Math.random() * 10 - 5;
      vertices.push(x, y, z);

      // Connect each particle to every other particle
      for (let j = 0; j < i; j++) {
        indices.push(i, j);
      }
    }

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    lineGeometry.setIndex(indices);

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  }

  ngOnInit() {
    this.scene.add(this.particles);
    this.scene.add(this.lines);
  }

  ngAfterViewInit() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    this.animate();
  }

  animate() {
    window.requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}
