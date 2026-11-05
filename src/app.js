import { Playback } from './core/playback.js';
import { project } from './config/project.js';
import { defaults, info } from './config/experiments.js';
import { validateExperiment } from './core/experiments.js';
import { $, bind } from './ui/dom.js';
import {
  number,
  range,
  select,
  toggle,
  coords,
  section,
  result,
  legend,
  explain,
} from './ui/templates.js';
import { renderControls as renderElectricControls } from './modules/electric/controls.js';
import { renderControls as renderCapacitorControls } from './modules/capacitor/controls.js';
import { renderControls as renderCircuitControls } from './modules/circuit/controls.js';
import { renderControls as renderMagneticControls } from './modules/magnetic/controls.js';
import { World } from './rendering/world.js';
import {
  electricAt,
  capacitor,
  circuit,
  rcCircuit,
  magneticAt,
  borisStep,
  lorentzForce,
  norm,
  sub,
  format,
} from './core/physics.js';
import { circuitMarkup } from './ui/charts.js';

let state = structuredClone(defaults),
  active = 'electric',
  view = '3d',
  world,
  simulation = null,
  rcPlaying = false,
  lastFrame = 0,
  uiTime = 0;

const playback = new Playback(
  Object.keys(defaults),
  !matchMedia('(prefers-reduced-motion: reduce)').matches,
);
let capacitorRun = { enabled: false };
function capVoltage() {
  const s = state.capacitor;
  return capacitorRun.enabled
    ? s.voltage * (1 - Math.exp(-Math.min(5, playback.get('capacitor').time * 0.5)))
    : s.voltage;
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('#toast').hidden = true), 4500);
}

function setupRanges() {
  document.querySelectorAll('[data-range]').forEach((el) =>
    el.addEventListener('input', () => {
      const target = $('#' + el.dataset.range);
      target.value = el.value;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }),
  );
}
function setDeepCoords(prefix, target, redraw = true) {
  for (let i = 0; i < 3; i++)
    bind(`${prefix}-${i}`, (v) => {
      target[i] = v;
      if (redraw) draw();
      else resetSimulation();
    });
}
function download(filename, data, type) {
  const a = document.createElement('a');
  const url =
    typeof data === 'string' && data.startsWith('data:')
      ? data
      : URL.createObjectURL(new Blob([data], { type }));
  a.href = url;
  a.download = filename;
  a.click();
  if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function particleControls(p, isMag) {
  return `${number('particle-q', 'Carga de la partícula', p.q, -10, 10, 0.1, isMag ? 'C' : 'µC')}${number('particle-mass', 'Masa', p.mass, 0.1, 10, 0.1, isMag ? 'kg' : 'mg')}${coords('particle-pos', 'Posición inicial (m)', p.position)}${coords('particle-vel', 'Velocidad inicial (m/s)', p.velocity, -10, 10)}<p class="small-note">Partícula de prueba clásica. Las fuentes permanecen fijas.</p><div class="button-row" style="margin-top:13px"><button class="primary-button" id="particle-play">▶ Lanzar</button><button class="secondary-button" id="particle-reset">↺ Borrar</button></div><button class="add-button" id="particle-csv">↓ Exportar trayectoria CSV</button><p id="particle-status" class="small-note">Lista para lanzar · integrador de Boris</p>`;
}
function renderControls() {
  const renderers = {
    electric: renderElectricControls,
    capacitor: renderCapacitorControls,
    circuit: renderCircuitControls,
    magnetic: renderMagneticControls,
  };
  renderers[active]({
    state,
    draw,
    renderControls,
    setDeepCoords,
    bindParticles,
    particleControls,
    rcToggle,
  });
  if (active === 'capacitor') {
    $('#controls').insertAdjacentHTML(
      'beforeend',
      section(
        'Carga RC en 3D',
        range(
          'cap-charge-r',
          'Resistencia de carga',
          state.capacitor.chargeResistance / 1e6,
          1,
          500,
          1,
          'MΩ',
        ) +
          '<div class="button-row"><button id="cap-charge" class="primary-button">Iniciar carga</button><button id="cap-steady" class="secondary-button">Estado estable</button></div><p class="small-note">La animación recorre 0–5τ. El tiempo físico usa τ = RC. Los puntos sobre las líneas son guías visuales, no partículas del dieléctrico.</p>',
      ),
    );
    bind('cap-charge-r', (v) => {
      state.capacitor.chargeResistance = v * 1e6;
      playback.reset('capacitor');
    });
    $('#cap-charge').onclick = () => {
      capacitorRun.enabled = true;
      playback.reset('capacitor');
      playback.play('capacitor', true);
      draw();
      updatePlaybackUI();
    };
    $('#cap-steady').onclick = () => {
      capacitorRun.enabled = false;
      draw();
    };
  }
  setupRanges();
  updateResults();
}

function bindParticles(p, isMag) {
  bind('particle-q', (v) => {
    p.q = v;
    resetSimulation();
  });
  bind('particle-mass', (v) => {
    p.mass = v;
    resetSimulation();
  });
  setDeepCoords('particle-pos', p.position, false);
  setDeepCoords('particle-vel', p.velocity, false);
  $('#particle-play').onclick = () => {
    playback.play(active, true);
    updatePlaybackUI();
    if (!simulation) {
      simulation = {
        running: true,
        state: { position: [...p.position], velocity: [...p.velocity], time: 0 },
        points: [[...p.position]],
        samples: [[0, ...p.position, ...p.velocity]],
        charge: p.q * (isMag ? 1 : 1e-6),
        mass: p.mass * (isMag ? 1 : 1e-6),
        steps: 0,
      };
    } else simulation.running = !simulation.running;
    $('#particle-play').textContent = simulation.running ? 'Ⅱ Pausar' : '▶ Continuar';
  };
  $('#particle-reset').onclick = () => resetSimulation();
  $('#particle-csv').onclick = () => {
    if (!simulation?.samples.length) {
      toast('Lanza una partícula antes de exportar su trayectoria.');
      return;
    }
    download(
      'trayectoria-fisica-ii.csv',
      't_s,x_m,y_m,z_m,vx_m_s,vy_m_s,vz_m_s\n' +
        simulation.samples.map((a) => a.join(',')).join('\n'),
      'text/csv;charset=utf-8',
    );
  };
}
function rcToggle(value) {
  rcPlaying = typeof value === 'boolean' ? value : !rcPlaying;
  const s = state.circuit;
  if (s.tauTime >= 5) s.tauTime = 0;
  if ($('#rc-play'))
    $('#rc-play').textContent = rcPlaying ? 'Ⅱ Pausar proceso' : '▶ Animar proceso RC';
}
function resetSimulation() {
  simulation = null;
  world?.clearParticle();
  if ($('#particle-play')) $('#particle-play').textContent = '▶ Lanzar';
  if ($('#particle-status'))
    $('#particle-status').textContent = 'Lista para lanzar · integrador de Boris';
  if (world) updateResults();
}
function draw(reset = true) {
  if (reset) {
    resetSimulation();
    rcPlaying = false;
    if ($('#rc-play')) $('#rc-play').textContent = '▶ Animar proceso RC';
  }
  const s = state[active],
    isCircuit = active === 'circuit';
  $('#world').hidden = false;
  $('#world').style.display = 'block';
  $('#circuit-analysis').hidden = !isCircuit;
  $('#scene').classList.toggle('circuit-scene', isCircuit);
  $('#view-2d').disabled = false;
  $('#view-3d').disabled = false;
  $('#home-camera').disabled = false;
  $('#capture').disabled = false;
  $('#scene-subtitle').textContent = view === '3d' ? 'ESPACIO 3D' : 'VISTA XY';
  $('#scene-hint').textContent = isCircuit
    ? 'Pulsa una resistencia para editar · Arrastra para orbitar'
    : view === '2d'
      ? 'Vista XY · rueda para acercar · botón derecho para desplazar'
      : 'Arrastra para orbitar · Rueda para acercar';
  if (active === 'electric') {
    world?.drawElectric(s);
    $('#scene-title').textContent = 'Cargas y flujo del campo';
    $('#legend').innerHTML =
      legend('#f2b564', 'Carga positiva') +
      legend('#71a9ff', 'Carga negativa') +
      legend('#dbeaff', 'Sonda P') +
      (s.equipotential ? legend('#87d6c8', `Equipotenciales ±${s.level} V`, true) : '');
    $('#scene-overlay').textContent = s.equipotential
      ? view === '3d'
        ? `Superficies V = ±${s.level} V · malla numérica`
        : `Curvas V = −${s.level}, 0, +${s.level} V en z = 0`
      : 'Arrastra las cargas sobre su plano XY · 1 división = 0.5 m';
    $('#explanation').innerHTML = explain(
      'El campo se suma. El potencial también.',
      'Las líneas indican la dirección de la fuerza sobre una carga positiva. La sonda calcula el campo y el potencial por superposición. Las curvas 2D se evalúan en z = 0.',
      'E = Σ kq r̂ / r²',
    );
  } else if (active === 'capacitor') {
    world?.drawCapacitor(s);
    $('#scene-title').textContent = 'Capacitor de placas paralelas';
    $('#legend').innerHTML =
      legend('#f2b564', 'Placa positiva') +
      legend('#71a9ff', 'Placa a 0 V') +
      legend('#83c7bd', 'Dieléctrico') +
      legend('#b8eee5', 'Campo eléctrico', true);
    $('#scene-overlay').textContent = 'Dimensiones ampliadas · polarización y carga superficial';
    $('#explanation').innerHTML = explain(
      'Más capacidad para la misma diferencia de potencial.',
      'C aumenta con el área y la permitividad; disminuye con la separación. Se desprecia el efecto de borde. La energía almacenada crece con el cuadrado del voltaje.',
      'C = ε₀ εᵣ A / d',
    );
  } else if (active === 'circuit') {
    $('#scene-title').textContent =
      s.mode === 'dc' ? 'Circuito resistivo · ley de Ohm' : 'Circuito RC · respuesta transitoria';
    world?.drawCircuit(s);
    $('#schematic').innerHTML = circuitMarkup(s);
    $('#scene-overlay').textContent = '';
    $('#legend').innerHTML =
      legend('#e9b469', 'Fuente de voltaje') +
      legend('#83c9bf', 'Resistencia') +
      legend('#80d2c5', s.mode === 'dc' ? 'Relación I–V' : 'Voltaje del capacitor', true);
    $('#explanation').innerHTML = explain(
      s.mode === 'dc'
        ? 'La misma física, distintas conexiones.'
        : 'El capacitor necesita tiempo para cargarse.',
      s.mode === 'dc'
        ? 'La corriente se conserva en cada nodo. Las etapas suman su resistencia; las ramas en paralelo comparten voltaje. La tabla muestra cada componente.'
        : 'τ = R equivalente · C. Durante la carga, el capacitor alcanza el 63.2 % de la tensión de la fuente en una constante de tiempo.',
      'V = I R',
    );
  } else {
    world?.drawMagnetic(s);
    $('#scene-title').textContent =
      s.mode === 'field' ? 'Líneas de campo magnético' : 'Trayectoria en campos E y B';
    $('#legend').innerHTML =
      s.mode === 'field'
        ? legend('#e48b75', 'Polo norte') +
          legend('#6496d8', 'Polo sur') +
          legend('#82c7bd', 'Campo B', true)
        : legend('#7396d0', 'Campo B (z)', true) +
          legend('#8ad5c8', 'Campo E (y)', true) +
          legend('#ffe19a', 'Trayectoria', true);
    $('#scene-overlay').textContent =
      s.mode === 'field'
        ? {
            dipole: 'Dipolo ideal · representación válida fuera del imán',
            wire: 'Conductor infinito sobre el eje z',
            loop: 'Biot–Savart · integración con 128 segmentos',
          }[s.source]
        : 'Escala de laboratorio · q en C, m en kg';
    $('#explanation').innerHTML = explain(
      s.mode === 'field'
        ? 'El magnetismo tiene dirección.'
        : 'Una fuerza que cambia la trayectoria.',
      s.mode === 'field'
        ? 'La dirección depende del sentido de la corriente o del momento magnético. Las líneas se dibujan con longitud normalizada: consulta la sonda para conocer la magnitud real.'
        : 'La fuerza magnética es perpendicular a la velocidad y no realiza trabajo. Un campo eléctrico puede cambiar la energía cinética. Con E = 0 se obtiene una hélice si vz ≠ 0.',
      'F = q(E + v × B)',
    );
  }
  updateResults();
}
function updateResults() {
  const s = state[active];
  let html = '';
  if (active === 'electric') {
    const e = electricAt(s.probe, s.charges, 1e-9),
      total = s.charges.reduce((sum, c) => sum + c.q, 0);
    html =
      result('Potencial en P', format(e.potential, 'V'), 'Referencia: V = 0 en el infinito') +
      result('Magnitud del campo', format(norm(e.field), 'N/C'), 'Evaluada en el punto P') +
      result('Carga neta', format(total, 'C'), `${s.charges.length} fuentes puntuales`) +
      result(
        'Tiempo de trayectoria',
        format(simulation?.state.time || 0, 's'),
        simulation
          ? `Rapidez ${format(norm(simulation.state.velocity), 'm/s')}`
          : 'Lanza una partícula para explorar',
      );
    if ($('#probe-vector'))
      $('#probe-vector').textContent = e.singular
        ? 'P coincide con una carga: campo y potencial no están definidos.'
        : `E = (${e.field.map((v) => Number(v.toPrecision(3))).join(', ')}) N/C`;
  } else if (active === 'capacitor') {
    const c = capacitor(s.area * 1e-4, s.distance * 1e-3, s.dielectric, capVoltage());
    html =
      result('Capacitancia', format(c.capacitance, 'F'), 'C = ε₀ εᵣ A / d') +
      result('Carga almacenada', format(c.charge, 'C'), 'Magnitud en cada placa · Q = CV') +
      result('Energía almacenada', format(c.energy, 'J'), 'U = ½ CV²') +
      result('Campo entre placas', format(c.field, 'V/m'), 'E = V / d · campo ideal');
  } else if (active === 'circuit') {
    const c = circuit(s.voltage, s.stages),
      rc =
        s.mode === 'rc'
          ? rcCircuit(
              c.resistance,
              s.capacitance * 1e-6,
              s.voltage,
              s.tauTime * c.resistance * s.capacitance * 1e-6,
              s.charging,
            )
          : null;
    html =
      result('Resistencia equivalente', format(c.resistance, 'Ω'), 'Suma de etapas en serie') +
      result(
        'Corriente total',
        format(rc ? rc.current : c.current, 'A'),
        rc ? 'Signo +: carga · signo −: descarga' : 'I = V / R equivalente',
      ) +
      result(
        rc ? 'Voltaje del capacitor' : 'Potencia total',
        format(rc ? rc.voltage : c.power, rc ? 'V' : 'W'),
        rc ? 'Respuesta analítica RC' : 'P = VI = Σ P de resistencias',
      ) +
      result(
        rc ? 'Constante de tiempo' : 'Voltaje de la fuente',
        format(rc ? rc.tau : s.voltage, rc ? 's' : 'V'),
        rc ? `t = ${format(s.tauTime * rc.tau, 's')}` : 'Fuente ideal de corriente continua',
      );
    if ($('#branch-results')) {
      const real = rc ? circuit(rc.current * c.resistance, s.stages) : c;
      $('#branch-results').innerHTML =
        '<table><thead><tr><th>R</th><th>V (V)</th><th>I (mA)</th><th>P (mW)</th></tr></thead><tbody>' +
        real.stages
          .flatMap((stage, i) =>
            stage.branches.map(
              (b, j) =>
                `<tr><td>${i + 1}.${j + 1}</td><td>${Number(b.voltage.toPrecision(3))}</td><td>${Number((b.current * 1000).toPrecision(3))}</td><td>${Number((b.power * 1000).toPrecision(3))}</td></tr>`,
            ),
          )
          .join('') +
        '</tbody></table>';
    }
  } else if (s.mode === 'field') {
    const b = magneticAt(s.probe, s.source, s.strength),
      p = s.probe;
    const excluded =
      (s.source === 'dipole' && norm(p) < 0.7) ||
      (s.source === 'wire' && Math.hypot(p[0], p[1]) < 0.012) ||
      (s.source === 'loop' && Math.hypot(Math.hypot(p[0], p[1]) - 1, p[2]) < 0.02);
    html =
      result(
        'Campo en P',
        excluded ? 'No definido' : format(norm(b), 'T'),
        excluded ? 'Sonda dentro de la fuente excluida' : 'Magnitud del campo magnético',
      ) +
      result('Componente Bx', excluded ? '—' : format(b[0], 'T'), 'Eje x') +
      result('Componente By', excluded ? '—' : format(b[1], 'T'), 'Eje y') +
      result('Componente Bz', excluded ? '—' : format(b[2], 'T'), 'Eje z');
    if ($('#mag-vector'))
      $('#mag-vector').textContent = excluded
        ? 'Mueve P fuera de la fuente para evaluar el campo ideal.'
        : 'Las coordenadas y el tamaño de la fuente están expresados en metros.';
  } else {
    const p = simulation?.state || { velocity: s.particle.velocity, time: 0 },
      q = s.particle.q,
      m = s.particle.mass,
      f = lorentzForce(q, p.velocity, [0, s.ey, 0], [0, 0, s.bz]);
    html =
      result('Fuerza de Lorentz', format(norm(f), 'N'), 'F = q(E + v × B)') +
      result('Energía cinética', format(0.5 * m * norm(p.velocity) ** 2, 'J'), 'K = ½ m |v|²') +
      result(
        'Radio con E = 0',
        s.bz && q
          ? format((m * Math.hypot(p.velocity[0], p.velocity[1])) / Math.abs(q * s.bz), 'm')
          : '∞',
        s.ey ? 'Referencia local; E cambia v⊥' : 'r = mv⊥ / |qB|',
      ) +
      result('Tiempo simulado', format(p.time || 0, 's'), 'Integración de Boris · Δt ≤ 0.005 s');
  }
  $('#results').innerHTML = html;
}
function setUnit(unit) {
  if (!info[unit]) return;
  window.scrollTo({ top: 0, behavior: 'instant' });
  active = unit;
  resetSimulation();
  rcPlaying = false;
  const [n, label, title, desc] = info[unit];
  $('#breadcrumb-unit').textContent = `Unidad ${n}`;
  $('#unit-eyebrow').textContent = `UNIDAD ${n} · ${label}`;
  $('#unit-title').textContent = title;
  $('#unit-description').textContent = desc;
  document.querySelectorAll('[data-unit]').forEach((b) => {
    const on = b.dataset.unit === unit;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  renderControls();
  $('#controls').scrollTop = 0;
  draw();
  updatePlaybackUI();
  history.replaceState(null, '', `#${unit}`);
}
function tick(now) {
  const realElapsed = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
  lastFrame = now;
  const elapsed = playback.advance(active, realElapsed);
  advance(elapsed, now);
}
function advance(elapsed, now) {
  const clock = playback.get(active);
  world?.animate(clock.time);
  if (active === 'capacitor') {
    const c = state.capacitor,
      ratio = c.voltage ? capVoltage() / c.voltage : 0;
    world?.capacitorVisual?.plates.forEach((p) => p.scale.setScalar(0.1 + 0.9 * ratio));
    if (capacitorRun.enabled) {
      const base = capacitor(c.area * 1e-4, c.distance * 1e-3, c.dielectric, c.voltage);
      const tau = base.capacitance * state.capacitor.chargeResistance;
      $('#scene-overlay').textContent =
        'Carga RC · t = ' +
        format(Math.min(5, clock.time * 0.5) * tau, 's') +
        ' · Vc = ' +
        format(capVoltage(), 'V') +
        ' · τ = ' +
        format(tau, 's');
    }
    if (now - uiTime > 100) {
      updateResults();
      uiTime = now;
    }
  }
  if (now - (advance.lastUI || 0) > 100) {
    updatePlaybackUI();
    advance.lastUI = now;
  }
  if (simulation?.running) {
    const sim = simulation,
      s = state[active],
      isMag = active === 'magnetic';
    let remaining = elapsed;
    while (remaining > 1e-8) {
      let dt = Math.min(0.005, remaining, 0.025 / Math.max(norm(sim.state.velocity), 0.01));
      if (isMag) dt = Math.min(dt, 0.06 / (Math.abs((sim.charge * s.bz) / sim.mass) + 1e-9));
      else {
        const a =
          norm(electricAt(sim.state.position, s.charges, 0.08).field) *
          Math.abs(sim.charge / sim.mass);
        dt = Math.min(dt, Math.sqrt(0.002 / (a + 1e-12)));
      }
      if (!Number.isFinite(dt) || dt < 1e-7) {
        stop('La partícula alcanzó una zona singular.');
        break;
      }
      const next = borisStep(
        sim.state,
        sim.charge,
        sim.mass,
        dt,
        isMag ? [0, s.ey, 0] : (p) => electricAt(p, s.charges, 0.08).field,
        isMag ? [0, 0, s.bz] : [0, 0, 0],
      );
      if (
        !next.position.every(Number.isFinite) ||
        (!isMag && s.charges.some((c) => norm(sub(c.position, next.position)) < 0.11))
      ) {
        stop('La partícula alcanzó una carga: simulación detenida.');
        break;
      }
      sim.state = next;
      remaining -= dt;
      sim.steps++;
      if (sim.steps % 3 === 0) {
        sim.points.push([...next.position]);
        sim.samples.push([next.time, ...next.position, ...next.velocity]);
      }
      if (norm(next.position) > 8) {
        stop('La partícula salió del dominio de 8 m.');
        break;
      }
      if (next.time >= 30 || sim.samples.length >= 20000) {
        stop('Trayectoria completada. Exporta los datos o vuelve a lanzar.');
        break;
      }
    }
    world?.updateParticle(sim.state.position, sim.points.slice(-4500));
    if (now - uiTime > 120) {
      updateResults();
      uiTime = now;
      if (sim.running && $('#particle-status'))
        $('#particle-status').textContent =
          `t = ${sim.state.time.toFixed(2)} s · rapidez ${format(norm(sim.state.velocity), 'm/s')}`;
    }
  }
  if (rcPlaying && active === 'circuit' && state.circuit.mode === 'rc') {
    const s = state.circuit;
    s.tauTime = Math.min(5, s.tauTime + elapsed * 0.55);
    if (now - uiTime > 70) {
      $('#rc-time').value = s.tauTime.toFixed(2);
      $('#rc-time-range').value = s.tauTime;
      draw(false);
      uiTime = now;
    }
    if (s.tauTime >= 5) {
      rcPlaying = false;
      $('#rc-play').textContent = '▶ Animar proceso RC';
    }
  }
}
function stop(message) {
  if (simulation) simulation.running = false;
  if ($('#particle-play')) $('#particle-play').textContent = '▶ Continuar';
  if ($('#particle-status')) $('#particle-status').textContent = message;
}

try {
  world = new World($('#world'));
  world.onFrame = () => tick(performance.now());
  world.onChargeMove = (index, position) => {
    if (active !== 'electric') return;
    const c = state.electric.charges[index];
    if (c.position.every((v, i) => v === position[i])) return;
    c.position = position;
    state.electric.preset = 'custom';
    for (let i = 0; i < 3; i++) $('#charge-p-' + index + '-' + i).value = position[i];
    $('#electric-preset').value = 'custom';
    draw();
  };
  world.onComponentSelect = (part) => {
    if (active !== 'circuit') return;
    if (part.source) {
      const s = state.circuit;
      if (s.mode === 'rc' && !s.charging) {
        toast('En descarga la fuente ya está desconectada. V define la carga inicial.');
        return;
      }
      if (s.voltage) {
        world.savedVoltage = s.voltage;
        s.voltage = 0;
      } else s.voltage = world.savedVoltage || 12;
      renderControls();
      draw();
    } else {
      const el = $('#resistor-' + part.stage + '-' + part.branch);
      el?.scrollIntoView({ block: 'nearest' });
      el?.focus();
      el?.select();
      toast('Edita R' + (part.stage + 1) + '.' + (part.branch + 1) + ' en el panel.');
    }
  };
} catch (error) {
  console.error(error);
  $('#scene').insertAdjacentHTML(
    'beforeend',
    '<div class="error-box" style="position:absolute;inset:30px">No se pudo iniciar WebGL. Activa la aceleración gráfica o prueba un navegador actualizado. Las calculadoras y el módulo de circuitos siguen disponibles.</div>',
  );
  const loop = (t) => {
    tick(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
document
  .querySelectorAll('[data-unit]')
  .forEach((b) => (b.onclick = () => setUnit(b.dataset.unit)));
for (const v of ['2d', '3d'])
  $('#view-' + v).onclick = () => {
    view = v;
    world?.setView(v);
    for (const other of ['2d', '3d']) {
      $('#view-' + other).classList.toggle('active', other === v);
      $('#view-' + other).setAttribute('aria-pressed', String(other === v));
    }
    draw();
  };
$('#home-camera').onclick = () => world?.home();
$('#capture').onclick = () => {
  if (world) download(`flux-${active}.png`, world.saveImage(), 'image/png');
};
$('#reset').onclick = () => {
  playback.reset(active);
  if (active === 'capacitor') capacitorRun.enabled = false;
  state[active] = structuredClone(defaults[active]);
  renderControls();
  draw();
  world?.home();
  toast('Unidad reiniciada.');
};
$('#export-state').onclick = () => {
  download(
    'experimento-fisica-ii.json',
    JSON.stringify({ schema: 'flux-experiment-v1', active, view, state }, null, 2),
    'application/json',
  );
  toast('Experimento guardado como JSON.');
};
$('#import-state').onchange = async (event) => {
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 200000) throw new Error('El archivo supera el límite de 200 kB.');
    const imported = validateExperiment(JSON.parse(await file.text()));
    state = imported.state;
    view = imported.view;
    world?.setView(view);
    for (const v of ['2d', '3d']) {
      $('#view-' + v).classList.toggle('active', v === view);
      $('#view-' + v).setAttribute('aria-pressed', String(v === view));
    }
    setUnit(imported.active);
    toast('Experimento abierto.');
  } catch (error) {
    toast('No se pudo abrir: ' + error.message);
  }
  event.target.value = '';
};
function updatePlaybackUI() {
  const u = playback.get(active);
  $('#animation-play').textContent = u.playing ? 'Ⅱ Pausar' : '▶ Reproducir';
  $('#animation-play').setAttribute('aria-pressed', String(u.playing));
  $('#animation-time').textContent = u.time.toFixed(2) + ' s visuales';
  $('#animation-speed').value = String(u.speed);
}
$('#animation-play').onclick = () => {
  playback.play(active, !playback.get(active).playing);
  updatePlaybackUI();
};
$('#animation-step').onclick = () => {
  playback.play(active, false);
  const dt = playback.advance(active, 0.05, true);
  advance(dt, performance.now());
  updatePlaybackUI();
};
$('#animation-speed').onchange = (e) => {
  playback.speed(active, Number(e.target.value));
};
$('#animation-restart').onclick = () => {
  playback.reset(active);
  resetSimulation();
  draw(false);
  updatePlaybackUI();
};
$('#team-members').replaceChildren(
  ...project.members.map((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    return li;
  }),
);
$('#team-teacher').textContent = project.teacher;
$('#team-degree').textContent = project.degree;
$('#team-cycle').textContent = project.cycle;
setUnit(location.hash.slice(1) || 'electric');
// Local automation and reproducible teaching demos. No network or account data.
window.FLUX = {
  getInteractiveTargets: () => world?.interactiveTargets() || [],
  getAnimationState: () => ({ ...playback.get(active), sample: world?.motionSample() || [] }),
  getCapacitorVoltage: capVoltage,
  getState: () => structuredClone({ schema: 'flux-experiment-v1', active, view, state }),
  getSimulation: () =>
    simulation
      ? structuredClone({
          state: simulation.state,
          running: simulation.running,
          samples: simulation.samples.length,
        })
      : null,
  getRenderInfo: () =>
    world
      ? {
          geometries: world.renderer.info.memory.geometries,
          calls: world.renderer.info.render.calls,
          objects: world.content.children.length,
        }
      : null,
  setUnit,
  validateExperiment,
  reset: () => $('#reset').click(),
};
