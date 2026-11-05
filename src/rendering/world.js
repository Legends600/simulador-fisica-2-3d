import { drawElectric as electricScene } from './units/electric.js';
import { drawCapacitor as capacitorScene } from './units/capacitor.js';
import { drawMagnetic as magneticScene } from './units/magnetic.js';
import { drawCircuit as circuitScene } from './units/circuit.js';
import { installInteractions } from './motion.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  electricAt,
  magneticAt,
  traceField,
  equipotentialMesh,
  norm,
  sub,
  unit,
} from '../core/physics.js';

import { COLORS } from './palette.js';
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x101c2c, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.03, 150);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 35;
    this.content = new THREE.Group();
    this.scene.add(this.content);
    this.motions = [];
    this.motionBuffers = [];
    this.scene.add(new THREE.AmbientLight(0xe3f0ff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 8, 10);
    this.scene.add(light);
    this.grid = new THREE.GridHelper(12, 24, 0x3a5065, 0x263b50);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.z = -0.035;
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.46;
    this.scene.add(this.grid);
    this.axes = new THREE.Group();
    this.scene.add(this.axes);
    for (const [end, text, color] of [
      [[5.6, 0, 0], 'x (m)', 0xbc8d7f],
      [[0, 5.6, 0], 'y (m)', 0x83b69e],
      [[0, 0, 5.6], 'z (m)', 0x81a7cc],
    ]) {
      this.arrow([0, 0, 0], end, color, 0.08, this.axes);
      this.label(text, end, '#91a7ba', 0.35, this.axes);
    }
    this.view = '3d';
    this.home();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    installInteractions(this);
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      if (this.onFrame) this.onFrame();
      this.renderer.render(this.scene, this.camera);
    });
  }
  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  home() {
    this.controls.target.set(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(...(this.view === '2d' ? [0, 0, 13.6] : [5, 3.5, 10.5]));
    this.controls.enableRotate = this.view !== '2d';
    this.controls.update();
  }
  setView(view) {
    this.view = view;
    this.grid.visible = true;
    this.home();
  }
  disposeObject(obj) {
    obj.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
  clear() {
    for (const o of [...this.content.children]) {
      this.disposeObject(o);
      this.content.remove(o);
    }
    this.particle = null;
    this.trail = null;
    this.grid.visible = true;
    this.axes.visible = true;
    this.motions = [];
    this.motionBuffers = [];
    this.capacitorVisual = null;
  }
  animate(time) {
    for (const motion of this.motions) motion(time);
  }
  motionSample() {
    return this.motionBuffers
      .flatMap((buffer) => Array.from(buffer.slice(0, 12)))
      .map((v) => Number(v.toFixed(5)));
  }
  interactiveTargets() {
    this.camera.updateMatrixWorld(true);
    this.content.updateMatrixWorld(true);
    const box = this.canvas.getBoundingClientRect();
    return this.content.children
      .filter((o) => o.userData.chargeIndex !== undefined || o.userData.component)
      .map((o) => {
        const p = o.position.clone().project(this.camera);
        return {
          ...o.userData,
          x: box.x + ((p.x + 1) * box.width) / 2,
          y: box.y + ((1 - p.y) * box.height) / 2,
        };
      });
  }
  line(points, color = COLORS.line, opacity = 0.7, parent = this.content) {
    if (points.length < 2) return;
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const object = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    );
    parent.add(object);
    return object;
  }
  arrow(origin, vector, color = COLORS.line, head = 0.13, parent = this.content) {
    const len = norm(vector);
    if (!Number.isFinite(len) || len < 1e-8) return;
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(...vector).normalize(),
      new THREE.Vector3(...origin),
      len,
      color,
      Math.min(head, len * 0.35),
      Math.min(head * 0.48, len * 0.16),
    );
    parent.add(arrow);
    return arrow;
  }
  sphere(position, radius, color) {
    const obj = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 }),
    );
    obj.position.set(...position);
    this.content.add(obj);
    return obj;
  }
  box(position, size, color, opacity = 1) {
    const obj = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.2,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity === 1,
      }),
    );
    obj.position.set(...position);
    this.content.add(obj);
    return obj;
  }
  label(text, position, color = '#d9e5f0', size = 0.38, parent = this.content) {
    const canvas = document.createElement('canvas');
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = '500 62px Segoe UI, sans-serif';
    canvas.width = Math.ceil(Math.max(128, ctx.measureText(text).width + 48));
    ctx.fillStyle = color;
    ctx.font = '500 62px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, 48);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
    );
    sprite.scale.set((size * canvas.width) / 96, size, 1);
    sprite.position.set(...position);
    parent.add(sprite);
    return sprite;
  }
  drawElectric(s) {
    return electricScene.call(this, s);
  }
  contours(charges, level, color) {
    const size = 5,
      n = 72,
      step = (size * 2) / n,
      values = [];
    for (let x = 0; x <= n; x++) {
      values[x] = [];
      for (let y = 0; y <= n; y++)
        values[x][y] = electricAt([-size + x * step, -size + y * step, 0], charges, 0.08).potential;
    }
    const segments = [];
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++) {
        const p = [
            [-size + x * step, -size + y * step, 0],
            [-size + (x + 1) * step, -size + y * step, 0],
            [-size + (x + 1) * step, -size + (y + 1) * step, 0],
            [-size + x * step, -size + (y + 1) * step, 0],
          ],
          v = [values[x][y], values[x + 1][y], values[x + 1][y + 1], values[x][y + 1]];
        if (!v.every(Number.isFinite)) continue;
        // Triangulation resolves the ambiguous marching-squares saddle consistently.
        for (const t of [
          [0, 1, 2],
          [0, 2, 3],
        ]) {
          const hit = [];
          for (let i = 0; i < 3; i++) {
            const a = t[i],
              b = t[(i + 1) % 3];
            if (v[a] >= level === v[b] >= level) continue;
            const f = (level - v[a]) / (v[b] - v[a]);
            hit.push(p[a].map((q, j) => q + f * (p[b][j] - q)));
          }
          if (hit.length === 2) segments.push(...hit.flat());
        }
      }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
    this.content.add(
      new THREE.LineSegments(
        geom,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }),
      ),
    );
  }
  drawCapacitor(s) {
    return capacitorScene.call(this, s);
  }
  drawMagnetic(s) {
    return magneticScene.call(this, s);
  }
  drawCircuit(s) {
    return circuitScene.call(this, s);
  }
  updateParticle(position, points) {
    if (!this.particle) this.particle = this.sphere(position, 0.085, COLORS.particle);
    this.particle.position.set(...position);
    if (this.trail) {
      this.content.remove(this.trail);
      this.disposeObject(this.trail);
    }
    this.trail = this.line(points, COLORS.particle, 0.95);
  }
  clearParticle() {
    for (const o of [this.particle, this.trail])
      if (o) {
        this.content.remove(o);
        this.disposeObject(o);
      }
    this.particle = null;
    this.trail = null;
  }
  saveImage() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }
}
