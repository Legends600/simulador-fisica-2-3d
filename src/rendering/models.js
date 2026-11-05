import * as THREE from 'three';

// Shared laboratory modelling. All surfaces and textures are generated locally.
export function material(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0.15,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
    ...options,
  });
}

export function mesh(parent, geometry, surface, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, surface);
  object.position.set(...position);
  object.castShadow = !surface.transparent;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function roundedBox(parent, position, size, surface, radius = 0.06) {
  const [w, h, d] = size;
  const r = Math.min(radius, w * 0.23, h * 0.23, d * 0.23);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: d - 2 * r,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r * 0.6,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -d / 2 + r);
  geometry.computeVertexNormals();
  return mesh(parent, geometry, surface, position);
}

export function rod(parent, a, b, radius, surface, segments = 16) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b);
  const object = mesh(
    parent,
    new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), segments),
    surface,
  );
  object.position.copy(start.clone().add(end).multiplyScalar(0.5));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return object;
}

export function cable(parent, points, surface, radius = 0.04) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
  );
  return mesh(
    parent,
    new THREE.TubeGeometry(curve, Math.max(16, points.length * 8), radius, 8, false),
    surface,
  );
}

export function ring(parent, position, radius, thickness, surface, rotation = [0, 0, 0]) {
  const object = mesh(parent, new THREE.TorusGeometry(radius, thickness, 8, 64), surface, position);
  object.rotation.set(...rotation);
  return object;
}

export function screw(parent, position, radius = 0.08) {
  const surface = material(0xa7bcc8, { metalness: 0.86, roughness: 0.24 });
  const head = mesh(
    parent,
    new THREE.CylinderGeometry(radius, radius, 0.045, 16),
    surface,
    position,
  );
  head.rotation.x = Math.PI / 2;
  roundedBox(
    parent,
    [position[0], position[1], position[2] + 0.025],
    [radius * 1.35, 0.016, 0.006],
    material(0x23343d),
    0.002,
  );
  return head;
}

// Printed surfaces sit on the model (and obey depth), unlike scientific callouts.
export function print(
  parent,
  text,
  position,
  width,
  height,
  { color = '#d5e9ed', background = null, font = '500', align = 'center' } = {},
) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.max(96, Math.round((768 * height) / width));
  const context = canvas.getContext('2d');
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.fillStyle = color;
  context.font = `${font} ${Math.floor(canvas.height * 0.58)}px "Segoe UI", sans-serif`;
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.fillText(
    text,
    align === 'left' ? 24 : canvas.width / 2,
    canvas.height / 2,
    canvas.width - 32,
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const object = mesh(
    parent,
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
    position,
  );
  object.castShadow = false;
  let previous = text;
  object.userData.setText = (value) => {
    if (value === previous) return;
    previous = value;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.fillStyle = color;
    context.fillText(
      value,
      align === 'left' ? 24 : canvas.width / 2,
      canvas.height / 2,
      canvas.width - 32,
    );
    texture.needsUpdate = true;
  };
  return object;
}

export function glow(parent, position, color, size = 0.8) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d'),
    gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const object = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  object.position.set(...position);
  object.scale.setScalar(size);
  parent.add(object);
  return object;
}

export function platform(world, y = -3.25, radius = 4.2) {
  const group = new THREE.Group();
  world.content.add(group);
  const body = mesh(
    group,
    new THREE.CylinderGeometry(radius, radius + 0.05, 0.18, 80),
    material(0x142d3f, { metalness: 0.65, roughness: 0.38 }),
    [0, y, 0],
  );
  ring(
    group,
    [0, y + 0.095, 0],
    radius - 0.07,
    0.018,
    material(0x3fb7c1, { emissive: 0x1d8c99, emissiveIntensity: 0.5 }),
    [Math.PI / 2, 0, 0],
  );
  body.receiveShadow = true;
  group.visible = world.view !== '2d';
  return group;
}
