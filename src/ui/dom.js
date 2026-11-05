export const $ = (s) => document.querySelector(s);
export function bind(id, fn, event = 'input') {
  const el = $('#' + id);
  if (!el) return;
  el.addEventListener(event, () => {
    if (el.type === 'number') {
      if (!el.checkValidity() || el.value === '') return;
      const r = $('#' + id + '-range');
      if (r) r.value = el.value;
    }
    fn(el.type === 'checkbox' ? el.checked : el.type === 'number' ? el.valueAsNumber : el.value);
  });
}
