export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

export function relativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return 'ahora';
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} d`;
  return new Date(timestamp).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function wordCount(text) {
  const t = (text ?? '').trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

let _escapeDiv = null;

export function escapeHtml(str) {
  if (!_escapeDiv) _escapeDiv = document.createElement('div');
  _escapeDiv.textContent = str ?? '';
  return _escapeDiv.innerHTML;
}

export function excerpt(body) {
  const t = (body ?? '').replace(/\s+/g, ' ').trim();
  return t.length ? t : 'Nota vacía';
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const result = fn(...args);
        if (result && typeof result.catch === 'function') {
          result.catch(err => console.error('[debounce]', err));
        }
      } catch (err) {
        console.error('[debounce]', err);
      }
    }, delay);
  };
}

export function showTemporalIndicator(el, cls = 'visible', duration = 1800) {
  if (!el) return;
  el.classList.add(cls);
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove(cls), duration);
}
