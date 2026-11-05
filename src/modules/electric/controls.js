import { defaults } from '../../config/experiments.js';
import { number, range, select, toggle, coords, section } from '../../ui/templates.js';
import { $, bind } from '../../ui/dom.js';
export function renderControls({
  state,
  draw,
  renderControls,
  setDeepCoords,
  bindParticles,
  particleControls,
  rcToggle,
}) {
  const s = state.electric;

  $('#controls').innerHTML =
    section(
      'Distribución de cargas',
      select(
        'electric-preset',
        'Configuración',
        [
          ['dipole', 'Dipolo eléctrico'],
          ['single', 'Carga positiva'],
          ['like', 'Dos cargas positivas'],
          ['quadrupole', 'Cuadrupolo'],
          ['custom', 'Personalizada'],
        ],
        s.preset,
      ) +
        `<div id="charges-list">${s.charges.map((c, i) => `<div class="charge-row"><div class="charge-top"><span class="charge-sign ${c.q < 0 ? 'negative' : ''}">${c.q < 0 ? '−' : '+'}</span><strong>q${i + 1}</strong><label class="charge-q"><input aria-label="Carga ${i + 1} en nanoculombios" id="charge-q-${i}" type="number" min="-20" max="20" step=".1" required value="${Number((c.q * 1e9).toFixed(4))}"> nC</label><button class="icon-button" data-delete-charge="${i}" aria-label="Eliminar carga ${i + 1}" ${s.charges.length === 1 ? 'disabled' : ''}>×</button></div><div class="charge-position">${['x', 'y', 'z'].map((a, j) => `<label>${a}<input id="charge-p-${i}-${j}" aria-label="Carga ${i + 1}, posición ${a} en metros" type="number" min="-4" max="4" step=".1" required value="${c.position[j]}"></label>`).join('')}</div></div>`).join('')}</div><button class="add-button" id="add-charge" ${s.charges.length >= 10 ? 'disabled' : ''}>＋ Añadir carga</button><p class="small-note">Coordenadas en metros · máximo 10 cargas.</p>`,
      `${s.charges.length} / 10`,
    ) +
    section(
      'Capas de visualización',
      toggle('show-lines', 'Líneas de campo', s.lines) +
        toggle('show-vectors', 'Vectores del campo en z = 0', s.vectors) +
        toggle('show-equipotential', 'Equipotenciales ±V', s.equipotential) +
        range('potential-level', 'Nivel de potencial', s.level, 2, 60, 1, 'V'),
    ) +
    section(
      'Sonda de potencial',
      coords('probe', 'Punto P del espacio (m)', s.probe) +
        `<p class="small-note" id="probe-vector"></p>`,
      'P',
    ) +
    `<details class="panel-section" id="particle-details"><summary>Trayectoria de una partícula</summary>${particleControls(s.particle, false)}</details>`;
  bind(
    'electric-preset',
    (v) => {
      const presets = {
        single: [{ q: 4e-9, position: [0, 0, 0] }],
        dipole: defaults.electric.charges,
        like: [
          { q: 4e-9, position: [-1.2, 0, 0] },
          { q: 4e-9, position: [1.2, 0, 0] },
        ],
        quadrupole: [
          { q: 4e-9, position: [-1, -1, 0] },
          { q: -4e-9, position: [1, -1, 0] },
          { q: 4e-9, position: [1, 1, 0] },
          { q: -4e-9, position: [-1, 1, 0] },
        ],
      };
      s.preset = v;
      if (presets[v]) s.charges = structuredClone(presets[v]);
      renderControls();
      draw();
    },
    'change',
  );
  s.charges.forEach((c, i) => {
    bind(`charge-q-${i}`, (v) => {
      c.q = v * 1e-9;
      s.preset = 'custom';
      $('#electric-preset').value = 'custom';
      const sign = $(`#charge-q-${i}`).closest('.charge-row').querySelector('.charge-sign');
      sign.textContent = v < 0 ? '−' : '+';
      sign.classList.toggle('negative', v < 0);
      draw();
    });
    for (let j = 0; j < 3; j++)
      bind(`charge-p-${i}-${j}`, (v) => {
        c.position[j] = v;
        s.preset = 'custom';
        $('#electric-preset').value = 'custom';
        draw();
      });
  });
  document.querySelectorAll('[data-delete-charge]').forEach(
    (b) =>
      (b.onclick = () => {
        s.charges.splice(Number(b.dataset.deleteCharge), 1);
        s.preset = 'custom';
        renderControls();
        draw();
      }),
  );
  $('#add-charge').onclick = () => {
    if (s.charges.length >= 10) return;
    s.charges.push({ q: 2e-9, position: [0, Math.min(3.5, 1 + s.charges.length * 0.25), 0] });
    s.preset = 'custom';
    renderControls();
    draw();
  };
  for (const [id, key] of [
    ['show-lines', 'lines'],
    ['show-vectors', 'vectors'],
    ['show-equipotential', 'equipotential'],
    ['potential-level', 'level'],
  ])
    bind(id, (v) => {
      s[key] = v;
      draw();
    });
  setDeepCoords('probe', s.probe);
  bindParticles(s.particle, false);
}
