import { circuit, rcCircuit, format } from '../core/physics.js';
const text = (x, y, value, size = 11, color = '#b4c6d7', anchor = 'start') =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${value}</text>`;
export function lineChart({ points, maxX, maxY, labelX, labelY, marker, color = '#80d2c5' }) {
  maxX = Math.max(maxX, 1e-12);
  maxY = Math.max(maxY, 1e-12);
  const w = 620,
    h = 175,
    left = 62,
    right = 20,
    top = 22,
    bottom = 34,
    pw = w - left - right,
    ph = h - top - bottom;
  const x = (v) => left + (v / maxX) * pw,
    y = (v) => h - bottom - (v / maxY) * ph;
  let svg = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${labelY} en función de ${labelX}">`;
  for (let i = 0; i <= 4; i++) {
    const yy = y((maxY * i) / 4),
      xx = x((maxX * i) / 4);
    svg +=
      `<path d="M${left},${yy} H${w - right}" stroke="#304357" stroke-width=".7"/>` +
      text(left - 10, yy + 4, Number(((maxY * i) / 4).toPrecision(3)), 9, '#8ba3b9', 'end') +
      text(xx, h - bottom + 16, Number(((maxX * i) / 4).toPrecision(3)), 9, '#8ba3b9', 'middle');
  }
  svg += `<path d="M${left},${top} V${h - bottom} H${w - right}" stroke="#648095" fill="none"/>`;
  svg += `<path d="${points.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(2)},${y(p[1]).toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
  if (marker) svg += `<circle cx="${x(marker[0])}" cy="${y(marker[1])}" r="4.5" fill="#ffc776"/>`;
  return (
    svg +
    text(left, 13, labelY, 10, '#c5d9e9') +
    text(w - right, h - 1, labelX, 10, '#a9c0d4', 'end') +
    '</svg>'
  );
}
export function circuitMarkup(s) {
  const calc = circuit(s.voltage, s.stages),
    w = 680,
    h = 235,
    left = 65,
    right = 625,
    top = 55,
    bottom = 195;
  const discharge = s.mode === 'rc' && !s.charging;
  let svg = `<svg class="circuit-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Esquema del circuito con ${s.stages.length} etapas"><path d="M${left},${top} V105 M${left},145 V${bottom} H${right} V${top}" fill="none" stroke="#8ea6bb" stroke-width="2"/>`;
  if (discharge)
    svg +=
      `<path d="M${left},105 V145" stroke="#8ea6bb" stroke-width="2"/>` +
      text(left + 8, 174, 'Fuente desconectada', 9, '#a9c0d4');
  else
    svg +=
      `<path d="M${left},105 V115 M${left},133 V145 M${left - 16},115 H${left + 16} M${left - 9},133 H${left + 9}" stroke="#efb76a" stroke-width="3"/>` +
      text(left - 25, 96, '+', 14, '#eeb267') +
      text(left - 24, 158, '−', 14, '#80aaf1') +
      text(left - 30, 178, `${s.voltage} V`, 11, '#d1dfeb');
  const gap = (right - left) / s.stages.length;
  s.stages.forEach((stage, si) => {
    const x0 = left + si * gap,
      x1 = x0 + gap,
      mid = (x0 + x1) / 2,
      spacing = 31,
      center = top + 10;
    const ys = stage.map((_, i) => center + (i - (stage.length - 1) / 2) * spacing);
    svg += `<path d="M${x0},${top} H${x0 + 12} V${ys[0]} M${x0 + 12},${ys[0]} V${ys.at(-1)} M${x1 - 12},${ys.at(-1)} V${ys[0]} V${top} H${x1}" stroke="#8ea6bb" stroke-width="2" fill="none"/>`;
    stage.forEach((r, bi) => {
      const y = ys[bi];
      svg +=
        `<path d="M${x0 + 12},${y} H${mid - 23} M${mid + 23},${y} H${x1 - 12}" stroke="#8ea6bb" stroke-width="2"/><rect x="${mid - 23}" y="${y - 6}" width="46" height="12" rx="1" fill="#294844" stroke="#83c9bf"/>` +
        text(mid, y - 11, `R${si + 1}.${bi + 1} · ${r} Ω`, 9, '#bfd8d6', 'middle');
    });
    const drop =
      s.mode === 'rc'
        ? rcCircuit(
            calc.resistance,
            s.capacitance * 1e-6,
            s.voltage,
            s.tauTime * calc.resistance * s.capacitance * 1e-6,
            s.charging,
          ).current * calc.stages[si].resistance
        : calc.stages[si].voltage;
    svg += text(mid, 138, format(drop, 'V'), 10, '#efbd79', 'middle');
  });
  if (s.mode === 'rc')
    svg +=
      `<rect x="320" y="185" width="40" height="20" fill="#101d2d"/><path d="M334,180 V210 M346,180 V210 M320,195 H334 M346,195 H360" stroke="#e9b469" stroke-width="2.5"/>` +
      text(340, 229, `C = ${s.capacitance} µF`, 10, '#d7e4ef', 'middle');
  else
    svg += text(
      340,
      221,
      'Fuente ideal de CC · conexiones en serie y en paralelo',
      10,
      '#93a9bd',
      'middle',
    );
  svg += '</svg>';
  let chart;
  if (s.mode === 'rc') {
    const c = s.capacitance * 1e-6,
      tau = calc.resistance * c,
      t = s.tauTime * tau;
    chart = lineChart({
      points: Array.from({ length: 101 }, (_, i) => [
        i * 0.05,
        rcCircuit(calc.resistance, c, s.voltage, i * 0.05 * tau, s.charging).voltage,
      ]),
      maxX: 5,
      maxY: Math.max(s.voltage, 1),
      labelX: 'Tiempo / τ',
      labelY: 'Voltaje en el capacitor (V)',
      marker: [s.tauTime, rcCircuit(calc.resistance, c, s.voltage, t, s.charging).voltage],
    });
  } else {
    const maxV = Math.max(24, s.voltage * 1.3),
      maxI = (maxV / calc.resistance) * 1000;
    chart = lineChart({
      points: [
        [0, 0],
        [maxV, maxI],
      ],
      maxX: maxV,
      maxY: maxI,
      labelX: 'Voltaje de la fuente (V)',
      labelY: 'Corriente total (mA)',
      marker: [s.voltage, calc.current * 1000],
    });
  }
  return svg + `<div class="mini-chart">${chart}</div>`;
}
