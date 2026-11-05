import { defaults } from '../../config/experiments.js';
import { number, range, select, toggle, coords, section } from '../../ui/templates.js';
import { $, bind } from '../../ui/dom.js';
export function renderControls({
  state,
  draw,
  renderControls,
  setDeepCoords,
  bindParticles,
  rcToggle,
}) {
  const s = state.circuit;

  $('#controls').innerHTML =
    section(
      'Fuente y configuración',
      range('circuit-voltage', 'Voltaje de la fuente', s.voltage, 0, 48, 0.5, 'V') +
        `<div class="segmented">${[
          ['series', 'Serie'],
          ['parallel', 'Paralelo'],
          ['mixed', 'Mixto'],
        ]
          .map(([v, t]) => `<button data-circuit-preset="${v}">${t}</button>`)
          .join('')}</div>`,
    ) +
    section(
      'Constructor de circuitos',
      `<p class="small-note">Las etapas se conectan en serie. Las ramas de cada etapa, en paralelo.</p>${s.stages.map((stage, i) => `<div class="stage"><div class="stage-title"><strong>Etapa ${i + 1}</strong><button class="icon-button" data-remove-stage="${i}" aria-label="Eliminar etapa ${i + 1}" ${s.stages.length === 1 ? 'disabled' : ''}>×</button></div>${stage.map((r, j) => `<label class="branch">R${i + 1}.${j + 1}<input id="resistor-${i}-${j}" type="number" min="1" max="100000" step="1" required value="${r}" aria-label="Resistencia ${i + 1}.${j + 1} en ohmios"> Ω<button class="icon-button" data-remove-branch="${i},${j}" aria-label="Eliminar resistencia ${i + 1}.${j + 1}" ${stage.length === 1 ? 'disabled' : ''}>×</button></label>`).join('')}<button class="add-button" data-add-branch="${i}" ${stage.length >= 4 ? 'disabled' : ''}>＋ Rama en paralelo</button></div>`).join('')}<button id="add-stage" class="add-button" ${s.stages.length >= 4 ? 'disabled' : ''}>＋ Etapa en serie</button>`,
    ) +
    section(
      'Modo de análisis',
      select(
        'circuit-mode',
        'Tipo de circuito',
        [
          ['dc', 'Resistencias · corriente continua'],
          ['rc', 'Resistencias + capacitor (RC)'],
        ],
        s.mode,
      ) +
        (s.mode === 'rc'
          ? range('rc-capacitance', 'Capacitancia', s.capacitance, 100, 10000, 100, 'µF') +
            select(
              'rc-direction',
              'Proceso',
              [
                ['charge', 'Carga desde 0 V'],
                ['discharge', 'Descarga desde V de la fuente'],
              ],
              s.charging ? 'charge' : 'discharge',
            ) +
            range('rc-time', 'Tiempo normalizado', s.tauTime, 0, 5, 0.01, 't / τ') +
            `<button id="rc-play" class="primary-button">▶ Animar proceso RC</button>`
          : '<p class="small-note">La gráfica I–V conserva la resistencia equivalente mientras cambia el voltaje.</p>'),
    ) +
    section('Resultados por resistencia', '<div class="table-wrap" id="branch-results"></div>');
  bind('circuit-voltage', (v) => {
    s.voltage = v;
    draw();
  });
  document.querySelectorAll('[data-circuit-preset]').forEach(
    (b) =>
      (b.onclick = () => {
        s.stages = structuredClone(
          {
            series: [[100], [220], [330]],
            parallel: [[100, 220, 330]],
            mixed: [[100], [220, 330]],
          }[b.dataset.circuitPreset],
        );
        renderControls();
        draw();
      }),
  );
  s.stages.forEach((stage, i) =>
    stage.forEach((r, j) =>
      bind(`resistor-${i}-${j}`, (v) => {
        s.stages[i][j] = v;
        draw();
      }),
    ),
  );
  document.querySelectorAll('[data-add-branch]').forEach(
    (b) =>
      (b.onclick = () => {
        s.stages[Number(b.dataset.addBranch)].push(100);
        renderControls();
        draw();
      }),
  );
  document.querySelectorAll('[data-remove-branch]').forEach(
    (b) =>
      (b.onclick = () => {
        const [i, j] = b.dataset.removeBranch.split(',').map(Number);
        s.stages[i].splice(j, 1);
        renderControls();
        draw();
      }),
  );
  document.querySelectorAll('[data-remove-stage]').forEach(
    (b) =>
      (b.onclick = () => {
        s.stages.splice(Number(b.dataset.removeStage), 1);
        renderControls();
        draw();
      }),
  );
  $('#add-stage').onclick = () => {
    s.stages.push([100]);
    renderControls();
    draw();
  };
  bind(
    'circuit-mode',
    (v) => {
      s.mode = v;
      rcToggle(false);
      renderControls();
      draw();
    },
    'change',
  );
  bind('rc-capacitance', (v) => {
    s.capacitance = v;
    draw();
  });
  bind('rc-time', (v) => {
    s.tauTime = v;
    draw(false);
  });
  bind(
    'rc-direction',
    (v) => {
      s.charging = v === 'charge';
      s.tauTime = 0;
      renderControls();
      draw();
    },
    'change',
  );
  if ($('#rc-play')) $('#rc-play').onclick = () => rcToggle();
}
