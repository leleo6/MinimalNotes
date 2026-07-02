/**
 * store.js — Abstracción de persistencia.
 *
 * Principio OCP: la interfaz (load / save) no cambia.
 * Principio SRP: única responsabilidad = leer y escribir el estado.
 *
 * FIX: Singleton del Store para evitar instancias múltiples por
 * operación, que podían causar condiciones de carrera al guardar
 * simultáneamente notas y configuración.
 */

const STORE_FILE    = 'notes.json';
const NOTES_KEY     = 'notes-data';
const SETTINGS_KEY  = 'settings-data';

/** @type {import('@tauri-apps/plugin-store').Store | null} */
let _store = null;

/**
 * Obtiene (o crea) la instancia singleton del Store.
 * @returns {Promise<import('@tauri-apps/plugin-store').Store>}
 */
async function getStore() {
  if (_store) return _store;
  const { Store } = await import('@tauri-apps/plugin-store');
  _store = await Store.load(STORE_FILE, { autoSave: false });
  return _store;
}

// ─── Notas ───────────────────────────────────────────────────────────────────

/**
 * Carga las notas desde tauri-plugin-store.
 * @returns {Promise<object[] | null>}
 */
export async function loadFromStore() {
  try {
    const store = await getStore();
    const raw   = await store.get(NOTES_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('[store] load error:', err);
    return null;
  }
}

/**
 * Persiste el array de notas en tauri-plugin-store.
 * @param {object[]} notes
 * @returns {Promise<void>}
 */
export async function saveToStore(notes) {
  try {
    const store = await getStore();
    await store.set(NOTES_KEY, JSON.stringify(notes));
    await store.save();
  } catch (err) {
    console.error('[store] save error:', err);
  }
}

// ─── Configuración ───────────────────────────────────────────────────────────

/**
 * Carga la configuración desde tauri-plugin-store.
 * @returns {Promise<object | null>}
 */
export async function loadSettingsFromStore() {
  try {
    const store = await getStore();
    const raw   = await store.get(SETTINGS_KEY);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error('[store] settings load error:', err);
    return null;
  }
}

/**
 * Persiste la configuración en tauri-plugin-store.
 * @param {object} settings
 * @returns {Promise<void>}
 */
export async function saveSettingsToStore(settings) {
  try {
    const store = await getStore();
    await store.set(SETTINGS_KEY, JSON.stringify(settings));
    await store.save();
  } catch (err) {
    console.error('[store] settings save error:', err);
  }
}
