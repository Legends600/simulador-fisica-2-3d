import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const files = [
  ['node_modules/three/build/three.module.js', 'three/three.module.js'],
  ['node_modules/three/build/three.core.js', 'three/three.core.js'],
  ['node_modules/three/examples/jsm/controls/OrbitControls.js', 'addons/controls/OrbitControls.js'],
  ['node_modules/three/LICENSE', 'THREE-LICENSE.txt'],
];
for (const file of [
  'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js',
  'postprocessing/UnrealBloomPass.js',
  'postprocessing/OutputPass.js',
  'postprocessing/Pass.js',
  'postprocessing/ShaderPass.js',
  'postprocessing/MaskPass.js',
  'shaders/CopyShader.js',
  'shaders/LuminosityHighPassShader.js',
  'shaders/OutputShader.js',
])
  files.push([`node_modules/three/examples/jsm/${file}`, `addons/${file}`]);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function verifyVendor() {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const manifest = JSON.parse(await readFile('vendor/manifest.json', 'utf8'));
  if (manifest.version !== pkg.dependencies.three) {
    throw new Error('Three.js cambió de versión. Ejecuta npm run vendor:sync.');
  }
  for (const [, target] of files) {
    if (sha256(await readFile(`vendor/${target}`)) !== manifest.files[target]) {
      throw new Error(`El recurso vendor/${target} está incompleto o modificado.`);
    }
  }
}

async function syncVendor() {
  const pkg = JSON.parse(await readFile('node_modules/three/package.json', 'utf8'));
  const manifest = { name: 'three', version: pkg.version, license: 'MIT', files: {} };
  for (const [source, target] of files) {
    await mkdir(resolve('vendor', target, '..'), { recursive: true });
    await copyFile(source, `vendor/${target}`);
    manifest.files[target] = sha256(await readFile(source));
  }
  await writeFile('vendor/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  await verifyVendor();
  console.log(`Three.js ${pkg.version}: recursos locales y licencia verificados.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes('--check')) await verifyVendor();
  else await syncVendor();
}
