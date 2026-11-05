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
  const s = state.capacitor;

  $('#controls').innerHTML =
    section(
      'Geometría de las placas',
      range('cap-area', 'Área de cada placa', s.area, 20, 600, 10, 'cm²') +
        range('cap-distance', 'Separación entre placas', s.distance, 0.5, 10, 0.1, 'mm'),
    ) +
    section(
      'Material dieléctrico',
      select(
        'dielectric-material',
        'Medio entre las placas',
        [
          ['1', 'Vacío · εr = 1'],
          ['2.1', 'PTFE · εr ≈ 2.1'],
          ['4', 'Vidrio · εr ≈ 4'],
          ['6', 'Mica · εr ≈ 6'],
          ['custom', 'Personalizado'],
        ],
        ['1', '2.1', '4', '6'].includes(String(s.dielectric)) ? String(s.dielectric) : 'custom',
      ) +
        range('cap-dielectric', 'Permitividad relativa', s.dielectric, 1, 12, 0.1, 'εr') +
        '<p class="small-note">Valores representativos; dependen del material y la frecuencia.</p>',
    ) +
    section(
      'Fuente de voltaje',
      range('cap-voltage', 'Diferencia de potencial', s.voltage, 0, 100, 1, 'V') +
        '<p class="small-note">La batería mantiene V constante al cambiar el dieléctrico.</p>',
    ) +
    section(
      'Experimento sugerido',
      '<p class="small-note">Duplica el área: C se duplica.<br>Duplica la separación: C se reduce a la mitad.<br>Duplica el voltaje: U se multiplica por cuatro.</p>',
    );
  for (const [id, key] of [
    ['cap-area', 'area'],
    ['cap-distance', 'distance'],
    ['cap-dielectric', 'dielectric'],
    ['cap-voltage', 'voltage'],
  ])
    bind(id, (v) => {
      s[key] = v;
      if (key === 'dielectric')
        $('#dielectric-material').value = ['1', '2.1', '4', '6'].includes(String(v))
          ? String(v)
          : 'custom';
      draw();
    });
  bind(
    'dielectric-material',
    (v) => {
      if (v !== 'custom') {
        s.dielectric = Number(v);
        renderControls();
        draw();
      }
    },
    'change',
  );
}
