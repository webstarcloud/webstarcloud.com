import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.css']
})
export class LogoComponent implements OnInit, AfterViewInit {

  @ViewChild('rendererContainer') rendererContainer!: ElementRef;

  renderer = new THREE.WebGLRenderer();
  scene;
  camera;
  width = window.innerWidth;
  height = window.innerHeight;
  active: boolean = true;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6f2da8);

    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 1, 400);
    this.camera.position.z = 2000;

    this.makeParticles();

  }

  makeParticles = () => {
    var particleCount = 2000;

    // define what the particles look like
    var material = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 80
    });

    // x y z coordinates
    var pX, pY, pZ;

    // Array for storing vertices
    var vertices = [];

    // define each particle's position and add it to the system
    for (var i = 0; i < particleCount; i++) {
      pX = Math.random() * 3000 - 1500;
      pY = Math.random() * 3000 - 1500;
      pZ = Math.random() * 3000 - 1500;
      vertices.push(pX, pY, pZ);
    }

    // our individual particles
    var particles = new THREE.BufferGeometry();
    particles.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    // big bang: create the space, pass it the particles and what the particles look like
    // our system of particles
    var particleSystem = new THREE.Points(particles, material);

    // add it to the scene
    this.scene.add(particleSystem);
  }

  ngOnInit() { }

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
  
    var object = this.scene.children[0];
  
    //set rotation
    object.rotation.x -= Math.random() * 0.001 - 0.005;
    object.rotation.y -= Math.random() * 0.001 - 0.005;
    object.rotation.z -= Math.random() * 0.001 - 0.005;
  
    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    this.active = false;
  
    this.renderer.dispose();  // Disposes the WebGL context
    // Disposes all materials in the scene
    this.scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
  
      node.material.dispose();
      node.geometry.dispose();
  
      if (node.material.map) {
        node.material.map.dispose();
      }
    });
  }
}