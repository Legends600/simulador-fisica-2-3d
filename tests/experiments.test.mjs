import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../src/config/experiments.js';
import { validateExperiment } from '../src/core/experiments.js';
const file = () => ({
  schema: 'flux-experiment-v1',
  active: 'capacitor',
  view: '3d',
  state: structuredClone(defaults),
});
test('Guardar y abrir conserva la resistencia del experimento de carga', () => {
  const data = file();
  data.state.capacitor.chargeResistance = 250e6;
  const imported = validateExperiment(JSON.parse(JSON.stringify(data)));
  assert.equal(imported.state.capacitor.chargeResistance, 250e6);
});
test('Los archivos anteriores siguen siendo válidos; se rechazan resistencias inválidas', () => {
  const data = file();
  delete data.state.capacitor.chargeResistance;
  assert.equal(validateExperiment(data).state.capacitor.chargeResistance, 100e6);
  data.state.capacitor.chargeResistance = -1;
  assert.throws(() => validateExperiment(data));
});
