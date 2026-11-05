export const number = (id, label, value, min, max, step = 1, unit = '') =>
  `<label class="field" for="${id}"><span>${label}<span class="unit">${unit}</span></span><input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
export const range = (id, label, value, min, max, step = 1, unit = '') =>
  `<label class="field" for="${id}"><span>${label}<span class="unit">${unit}</span></span><span class="range-row"><input type="range" id="${id}-range" aria-label="${label}, deslizador" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${id}"><input type="number" id="${id}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${value}" required></span></label>`;
export const select = (id, label, options, current) =>
  `<label class="field" for="${id}"><span>${label}</span><select id="${id}">${options.map(([v, l]) => `<option value="${v}" ${v === current ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
export const toggle = (id, label, value) =>
  `<label class="toggle"><input id="${id}" type="checkbox" ${value ? 'checked' : ''}>${label}</label>`;
export const coords = (prefix, label, values, min = -5, max = 5) =>
  `<div class="small-note">${label}</div><div class="coordinates">${['x', 'y', 'z'].map((a, i) => number(`${prefix}-${i}`, a, values[i], min, max, 0.1)).join('')}</div>`;
export const section = (title, body, tag = '') =>
  `<div class="panel-section"><div class="section-heading"><h2>${title}</h2>${tag ? `<span class="tag">${tag}</span>` : ''}</div>${body}</div>`;
export const result = (label, value, detail) =>
  `<article class="result"><div class="result-label">${label}</div><div class="result-value">${value}</div><div class="result-unit">${detail}</div></article>`;
export const legend = (color, label, line = false) =>
  `<span class="legend-item"><i class="${line ? 'legend-line' : 'legend-dot'}" style="background:${color}"></i>${label}</span>`;
export const explain = (title, body, formula) =>
  `<div><h2>${title}</h2><p>${body}</p></div><div class="formula">${formula}</div>`;
