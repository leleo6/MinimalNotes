/**
 * utils.js — Funciones puras sin efectos secundarios.
 *
 * Principio DRY: un solo lugar para uid, tiempo relativo,
 * conteo de palabras y escape HTML. Todos los módulos importan
 * desde aquí; nunca duplican la lógica.
 */

/**
 * Genera un ID único basado en timestamp + random.
 * @returns {string}
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Devuelve una representación legible del tiempo transcurrido.
 * @param {number} timestamp — epoch ms
 * @returns {string}
 */
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

/**
 * Cuenta palabras en un texto.
 * @param {string} text
 * @returns {number}
 */
export function wordCount(text) {
  const t = (text ?? '').trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * Escapa caracteres HTML para inserción segura en innerHTML.
 * Previene XSS al mostrar contenido de notas.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/**
 * Extrae un fragmento de texto para el listado.
 * @param {string} body
 * @returns {string}
 */
export function excerpt(body) {
  const t = (body ?? '').replace(/\s+/g, ' ').trim();
  return t.length ? t : 'Nota vacía';
}

/**
 * Crea una función debounce que retrasa la ejecución de fn.
 * Principio DRY: un único debounce reutilizable en toda la app.
 * @param {Function} fn
 * @param {number} delay — ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
