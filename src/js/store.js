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

const STORE_FILE      = 'notes.json';
const NOTES_KEY       = 'notes-data';
const SETTINGS_KEY    = 'settings-data';
const WINDOWS_KEY     = 'windows-data';

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

/**
 * Helper interno — persiste un valor en el store.
 * DRY: usado por saveToStore, saveSettingsToStore y saveWindowStates.
 */
async function setStoreValue(key, data) {
  try {
    const store = await getStore();
    await store.set(key, JSON.stringify(data));
    await store.save();
  } catch (err) {
    console.error(`[store] error al guardar "${key}":`, err);
  }
}

/**
 * Helper interno — carga un valor del store.
 * DRY: usado por loadFromStore, loadSettingsFromStore y loadWindowStates.
 */
async function getStoreValue(key) {
  try {
    const store = await getStore();
    const raw   = await store.get(key);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error(`[store] error al cargar "${key}":`, err);
    return null;
  }
}

// ─── Notas ───────────────────────────────────────────────────────────────────

/**
 * Carga las notas desde tauri-plugin-store.
 * @returns {Promise<object[] | null>}
 */
export async function loadFromStore() {
  return getStoreValue(NOTES_KEY);
}

/**
 * Persiste el array de notas en tauri-plugin-store.
 * @param {object[]} notes
 * @returns {Promise<void>}
 */
export async function saveToStore(notes) {
  return setStoreValue(NOTES_KEY, notes);
}

// ─── Configuración ───────────────────────────────────────────────────────────

/**
 * Carga la configuración desde tauri-plugin-store.
 * @returns {Promise<object | null>}
 */
export async function loadSettingsFromStore() {
  const raw = await getStoreValue(SETTINGS_KEY);
  return raw;
}

/**
 * Persiste la configuración en tauri-plugin-store.
 * @param {object} settings
 * @returns {Promise<void>}
 */
export async function saveSettingsToStore(settings) {
  return setStoreValue(SETTINGS_KEY, settings);
}

// ─── Window States ───────────────────────────────────────────────────────────

export async function saveWindowStates(states) {
  return setStoreValue(WINDOWS_KEY, states);
}

export async function loadWindowStates() {
  return getStoreValue(WINDOWS_KEY);
}
