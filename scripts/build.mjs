import { mkdir, cp, copyFile, rm } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { verifyVendor } from './vendor.mjs';
await verifyVendor();
const projectRoot = resolve(process.cwd()),
  outputDirectory = resolve(projectRoot, 'dist');
if (dirname(outputDirectory) !== projectRoot || basename(outputDirectory) !== 'dist')
  throw new Error('Ruta de build inválida.');
await rm(outputDirectory, { recursive: true, force: true });
await mkdir('dist/vendor', { recursive: true });
for (const path of ['src', 'docs', 'assets', 'vendor'])
  await cp(path, `dist/${path}`, { recursive: true });
await copyFile('index.html', 'dist/index.html');
console.log('Build completo: dist/ (sin dependencias externas en tiempo de ejecución)');
