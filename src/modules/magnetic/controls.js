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
  const s = state.magnetic;

  $('#controls').innerHTML =
    section(
      'Experimento',
      `<div class="segmented"><button data-magnetic-mode="field" class="${s.mode === 'field' ? 'active' : ''}">Campo magnético</button><button data-magnetic-mode="lorentz" class="${s.mode === 'lorentz' ? 'active' : ''}">Fuerza de Lorentz</button></div>`,
    ) +
    (s.mode === 'field'
      ? section(
          'Fuente de campo',
          select(
            'mag-source',
            'Modelo',
            [
              ['dipole', 'Imán · dipolo ideal'],
              ['wire', 'Conductor rectilíneo infinito'],
              ['loop', 'Espira circular · radio 1 m'],
            ],
            s.source,
          ) +
            range(
              'mag-strength',
              s.source === 'dipole' ? 'Momento magnético' : 'Corriente eléctrica',
              s.strength,
              -10,
              10,
              0.5,
              s.source === 'dipole' ? 'A·m²' : 'A',
            ),
        ) +
        section(
          'Sonda de campo',
          coords('mag-probe', 'Punto P del espacio (m)', s.probe) +
            '<p class="small-note" id="mag-vector"></p>',
        ) +
        section(
          'Prueba la regla de la mano derecha',
          '<p class="small-note">Invierte el signo de la corriente o del momento: cambia el sentido de las líneas de campo.</p>',
        )
      : section(
          'Campos uniformes cruzados',
          range('lorentz-e', 'Campo eléctrico Ey', s.ey, -3, 3, 0.1, 'N/C') +
            range('lorentz-b', 'Campo magnético Bz', s.bz, -3, 3, 0.1, 'T') +
            '<p class="small-note">E apunta en y; B apunta en z. Son perpendiculares cuando ambos son distintos de cero.</p>',
        ) + section('Partícula cargada', particleControls(s.particle, true)));
  document.querySelectorAll('[data-magnetic-mode]').forEach(
    (b) =>
      (b.onclick = () => {
        s.mode = b.dataset.magneticMode;
        renderControls();
        draw();
      }),
  );
  bind(
    'mag-source',
    (v) => {
      s.source = v;
      renderControls();
      draw();
    },
    'change',
  );
  bind('mag-strength', (v) => {
    s.strength = v;
    draw();
  });
  setDeepCoords('mag-probe', s.probe);
  bind('lorentz-e', (v) => {
    s.ey = v;
    draw();
  });
  bind('lorentz-b', (v) => {
    s.bz = v;
    draw();
  });
  if (s.mode === 'lorentz') bindParticles(s.particle, true);
}
