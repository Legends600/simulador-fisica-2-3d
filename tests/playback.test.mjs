import test from 'node:test';
import assert from 'node:assert/strict';
import { Playback } from '../src/core/playback.js';
test('Pausar congela el reloj; un paso permite inspeccionar un instante', () => {
  const p = new Playback(['a']);
  p.advance('a', 1);
  p.play('a', false);
  assert.equal(p.advance('a', 2), 0);
  assert.equal(p.get('a').time, 1);
  p.advance('a', 0.05, true);
  assert.equal(p.get('a').time, 1.05);
});
test('Unidades y velocidades independientes', () => {
  const p = new Playback(['a', 'b']);
  p.speed('a', 2);
  p.advance('a', 0.5);
  p.advance('b', 0.5);
  assert.equal(p.get('a').time, 1);
  assert.equal(p.get('b').time, 0.5);
  p.reset('a');
  assert.equal(p.get('a').time, 0);
  assert.equal(p.get('b').time, 0.5);
});
test('El reloj rechaza pasos y velocidades inválidos', () => {
  const p = new Playback(['a']);
  assert.throws(() => p.advance('a', -1), RangeError);
  assert.throws(() => p.advance('a', Infinity), RangeError);
  assert.throws(() => p.speed('a', 20), RangeError);
});
