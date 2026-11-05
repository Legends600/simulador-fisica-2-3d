import { slides } from './slides-data.js';
import { layoutSlide } from './deck-layout.js';
const $ = (s) => document.querySelector(s),
  escape = (s) =>
    String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function chart(c) {
  const w = 625,
    h = 380,
    l = 75,
    r = 18,
    t = 40,
    b = 65,
    pw = w - l - r,
    ph = h - t - b;
  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${c.title}">`;
  for (let i = 0; i <= 4; i++) {
    const y = t + ph - (i * ph) / 4;
    svg += `<path d="M${l},${y} H${w - r}" stroke="#dae4eb"/><text x="${l - 12}" y="${y + 5}" text-anchor="end" fill="#48657c" font-size="16">${Number(((c.max * i) / 4).toPrecision(3))}</text>`;
  }
  const pts = c.values.map((v, i) => [
    l + (i / (c.values.length - 1)) * pw,
    t + ph - (v / c.max) * ph,
  ]);
  svg += `<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')}" fill="none" stroke="#006b85" stroke-width="4"/>`;
  c.categories.forEach((label, i) => {
    svg += `<text x="${pts[i][0]}" y="${h - 37}" text-anchor="middle" fill="#48657c" font-size="15">${label}</text>`;
  });
  return (
    svg +
    `<text x="${l}" y="18" fill="#00365f" font-size="18">${c.yTitle}</text><text x="${w - r}" y="${h - 4}" text-anchor="end" fill="#48657c" font-size="18">${c.xTitle}</text></svg>`
  );
}
$('#slides').innerHTML = slides
  .map((s, i) => {
    const l = layoutSlide(s, i, slides.length);
    return `<section class="slide" id="slide-${i + 1}" aria-label="${escape(s.title)}"><div class="slide-canvas" style="background:${l.background}">${l.items
      .map((item) => {
        const st = `left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;`;
        if (item.type === 'text')
          return `<div class="deck-text" style="${st}font-size:${item.size}px;color:${item.color};font-weight:${item.bold ? 650 : 400}">${escape(item.value)}</div>`;
        if (item.type === 'image')
          return `<img style="${st}" src="../${item.src}" alt="${escape(s.title)}">`;
        return `<div class="deck-chart" style="${st}">${chart(item.data)}</div>`;
      })
      .join('')}</div></section>`;
  })
  .join('');
let current = Math.max(0, Math.min(slides.length - 1, Number(location.hash.slice(1) || 1) - 1));
function resize() {
  const scale = Math.min(Math.min(innerWidth - 36, 1500) / 1280, (innerHeight - 165) / 720);
  document
    .querySelectorAll('.slide-canvas')
    .forEach((el) => (el.style.transform = `scale(${scale})`));
  document.querySelectorAll('.slide').forEach((el) => {
    el.style.width = 1280 * scale + 'px';
    el.style.height = 720 * scale + 'px';
  });
}
function show(n) {
  current = Math.max(0, Math.min(slides.length - 1, n));
  document
    .querySelectorAll('.slide')
    .forEach((s, i) => s.classList.toggle('active', i === current));
  $('#counter').textContent = `${current + 1} / ${slides.length}`;
  $('#notes').textContent = slides[current].notes;
  $('#previous').disabled = current === 0;
  $('#next').disabled = current === slides.length - 1;
  history.replaceState(null, '', `#${current + 1}`);
  resize();
}
function notes() {
  $('#notes').hidden = !$('#notes').hidden;
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {}
}
$('#previous').onclick = () => show(current - 1);
$('#next').onclick = () => show(current + 1);
$('#show-notes').onclick = notes;
$('#fullscreen').onclick = fullscreen;
document.addEventListener('keydown', (e) => {
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault();
    show(current + 1);
  }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault();
    show(current - 1);
  }
  if (e.key === 'Home') show(0);
  if (e.key === 'End') show(slides.length - 1);
  if (e.key.toLowerCase() === 'n') notes();
  if (e.key.toLowerCase() === 'f') fullscreen();
});
addEventListener('resize', resize);
show(current);
