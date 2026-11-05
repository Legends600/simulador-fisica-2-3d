import { mkdir, cp, copyFile, rm } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
const projectRoot = resolve(process.cwd()),
  outputDirectory = resolve(projectRoot, 'dist');
if (dirname(outputDirectory) !== projectRoot || basename(outputDirectory) !== 'dist')
  throw new Error('Ruta de build inválida.');
await rm(outputDirectory, { recursive: true, force: true });
await mkdir('dist/vendor', { recursive: true });
for (const path of ['src', 'docs', 'assets']) await cp(path, `dist/${path}`, { recursive: true });
await copyFile('index.html', 'dist/index.html');
await cp('node_modules/three/build', 'dist/vendor/three', { recursive: true });
await mkdir('dist/vendor/addons/controls', { recursive: true });
await copyFile(
  'node_modules/three/examples/jsm/controls/OrbitControls.js',
  'dist/vendor/addons/controls/OrbitControls.js',
);
await copyFile('node_modules/three/LICENSE', 'dist/vendor/THREE-LICENSE.txt');
console.log('Build completo: dist/ (sin dependencias externas en tiempo de ejecución)');
