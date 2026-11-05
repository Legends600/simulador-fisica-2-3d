import * as THREE from 'three';

export function addFlow(world, paths, { color = 0x9ee9df, speed = 0.13, count = 2 } = {}) {
  const routes = [];
  for (const points of paths) {
    if (points.length < 2) continue;
    const curve = new THREE.CurvePath();
    for (let i = 1; i < points.length; i++)
      curve.add(
        new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])),
      );
    for (let i = 0; i < count; i++) routes.push({ curve, offset: i / count, speed });
  }
  if (!routes.length) return;
  const positions = new Float32Array(routes.length * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color,
      size: 0.075,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    }),
  );
  world.content.add(points);
  world.motions.push((time) => {
    routes.forEach(({ curve, offset, speed }, i) => {
      const phase = (((time * speed + offset) % 1) + 1) % 1;
      const p = curve.getPoint(phase);
      positions.set([p.x, p.y, p.z], i * 3);
    });
    geometry.attributes.position.needsUpdate = true;
  });
  world.motionBuffers.push(positions);
}

export function installInteractions(world) {
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let dragged = null;
  const target = (event) => {
    world.camera.updateMatrixWorld(true);
    world.content.updateMatrixWorld(true);
    const rect = world.canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, world.camera);
    return ray
      .intersectObjects(world.content.children, true)
      .find(
        (hit) => hit.object.userData.chargeIndex !== undefined || hit.object.userData.component,
      );
  };
  world.canvas.addEventListener(
    'pointerdown',
    (event) => {
      const hit = target(event);
      if (!hit) return;
      if (hit.object.userData.component) {
        event.preventDefault();
        event.stopImmediatePropagation();
        world.onComponentSelect?.(hit.object.userData.component);
        return;
      }
      dragged = {
        index: hit.object.userData.chargeIndex,
        plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -hit.object.position.z),
      };
      world.controls.enabled = false;
      world.canvas.setPointerCapture(event.pointerId);
      event.stopImmediatePropagation();
    },
    true,
  );
  world.canvas.addEventListener('pointermove', (event) => {
    if (!dragged) {
      world.canvas.style.cursor = target(event) ? 'grab' : '';
      return;
    }
    target(event);
    const point = new THREE.Vector3();
    if (ray.ray.intersectPlane(dragged.plane, point)) {
      world.onChargeMove?.(
        dragged.index,
        [point.x, point.y, point.z].map((v) => Math.round(Math.max(-4, Math.min(4, v)) * 10) / 10),
      );
    }
  });
  const end = () => {
    dragged = null;
    world.controls.enabled = true;
    world.canvas.style.cursor = '';
  };
  world.canvas.addEventListener('pointerup', end);
  world.canvas.addEventListener('pointercancel', end);
}
