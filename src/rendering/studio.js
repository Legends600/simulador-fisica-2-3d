import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function installStudio(world) {
  const { renderer, scene } = world;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.background = new THREE.Color(0x0d1813);
  scene.fog = new THREE.FogExp2(0x0d1813, 0.021);
  scene.add(new THREE.HemisphereLight(0xc2e5ff, 0x142331, 1.5));
  const key = new THREE.DirectionalLight(0xffebd1, 3.4);
  key.position.set(-3, 7, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 28 });
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0003;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6bcaff, 2.5);
  rim.position.set(5, 2, -6);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x87ffe0, 0.8);
  fill.position.set(-6, -1, 2);
  scene.add(fill);

  // Local studio reflections: no HDR download, no remote asset dependency.
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x253b50);
  for (const [position, scale, intensity, color] of [
    [[-5, 5, 4], [4, 7, 1], 7, 0xffedcf],
    [[5, 2, 0], [2, 6, 1], 5, 0xa8d9ff],
    [[0, 7, -4], [8, 2, 1], 4, 0xd4fff1],
  ]) {
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    card.material.color.multiplyScalar(intensity);
    card.position.set(...position);
    card.scale.set(...scale);
    card.lookAt(0, 0, 0);
    room.add(card);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  world.environment = generator.fromScene(room, 0.06, 0.1, 40, { size: 128 });
  scene.environment = world.environment.texture;
  scene.environmentIntensity = 0.65;
  generator.dispose();
  room.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  world.composer = new EffectComposer(renderer);
  world.composer.renderTarget1.samples = 2;
  world.composer.renderTarget2.samples = 2;
  world.composer.addPass(new RenderPass(scene, world.camera));
  world.bloom = new UnrealBloomPass(new THREE.Vector2(640, 360), 0.32, 0.55, 1.1);
  world.composer.addPass(world.bloom);
  world.composer.addPass(new OutputPass());
  renderer.info.autoReset = false;
  world.quality = innerWidth < 700 ? 'light' : 'studio';
  world.setQuality(world.quality);
}
