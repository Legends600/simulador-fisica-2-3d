import { project } from '../src/config/project.js';
export function layoutSlide(s, index, total) {
  const dark = s.layout === 'hero',
    ink = dark ? '#f2f7fb' : '#00365f',
    muted = dark ? '#b1cbde' : '#48657c',
    gold = '#ba8400',
    items = [];
  const text = (value, x, y, w, h, size = 26, color = ink, bold = false) =>
    items.push({ type: 'text', value, x, y, w, h, size, color, bold });
  const image = (name, x, y, w, h, logo = false) =>
    items.push({
      type: 'image',
      src: logo ? 'assets/brand/upeu.png' : `assets/figures/${name}.png`,
      x,
      y,
      w,
      h,
    });
  text(s.unit || 'UNIVERSIDAD PERUANA UNIÓN', 64, 32, 1000, 30, 14, muted, true);
  text(`${String(index + 1).padStart(2, '0')} / ${total}`, 1150, 32, 80, 30, 14, muted);
  if (s.layout === 'cover') {
    image('', 64, 78, 160, 145, true);
    text('FÍSICA II', 64, 246, 530, 40, 23, gold, true);
    text(s.title, 64, 307, 580, 165, 55, ink, true);
    text(s.subtitle, 64, 495, 530, 70, 25, muted);
    text(`${project.degree}\n${project.cycle}`, 64, 617, 600, 60, 18, muted);
    image(s.image, 653, 210, 563, 365);
  } else if (s.layout === 'team') {
    text(s.title, 64, 94, 1000, 85, 48, ink, true);
    project.members.forEach((n, i) => text(n, 64, 240 + i * 67, 700, 60, 34, ink, true));
    text(`Docente\n${project.teacher}`, 64, 497, 700, 95, 24, muted);
    text(`${project.degree} · ${project.cycle}`, 64, 635, 1050, 40, 19, muted);
    image('', 915, 235, 235, 213, true);
  } else {
    text(s.title, 64, 87, 1152, 110, 45, ink, true);
    if (s.layout === 'overview')
      s.items.forEach(([n, title, body], i) => {
        const y = 226 + i * 110;
        text(n, 64, y, 100, 85, 50, gold, true);
        text(title, 190, y + 4, 950, 50, 31, ink, true);
        text(body, 190, y + 51, 950, 42, 23, muted);
      });
    if (s.layout === 'experiment') {
      s.body.forEach((p, i) =>
        text(p, 64, 239 + i * 80, 510, 75, 26, i === 1 ? ink : muted, i === 1),
      );
      text(s.formula, 64, 520, 525, 130, 35, ink, true);
      image(s.image, 622, 218, 594, 390);
    }
    if (s.layout === 'hero') {
      image(s.image, 183, 207, 914, 370);
      text(s.caption, 64, 603, 1130, 65, 23, muted);
      text(s.formula, 64, 660, 1130, 42, 27, '#f5cb66', true);
    }
    if (s.layout === 'chart') {
      text(s.stat, 64, 240, 480, 100, 61, ink, true);
      s.body.forEach((p, i) => text(p, 64, 365 + i * 70, 485, 70, 25, muted));
      items.push({ type: 'chart', data: s.chart, x: 590, y: 230, w: 625, h: 380 });
    }
    if (s.layout === 'comparison')
      s.images.forEach((pic, i) => {
        const x = 64 + i * 590;
        image(pic, x, 215, 560, 320);
        text(s.headings[i], x, 564, 560, 50, 29, ink, true);
        text(s.captions[i], x, 621, 560, 50, 24, muted);
      });
    if (s.layout === 'architecture')
      s.items.forEach(([folder, desc], i) => {
        const y = 220 + i * 83;
        text(folder, 64, y, 330, 60, 32, gold, true);
        text(desc, 410, y + 3, 790, 65, 29, ink);
      });
    if (s.layout === 'validation')
      s.items.forEach(([name, desc], i) => {
        const y = 236 + i * 101;
        text(name, 64, y, 290, 70, 31, gold, true);
        text(desc, 370, y + 2, 830, 75, 28, ink);
      });
  }
  return { background: dark ? '#082b47' : '#ffffff', items };
}
