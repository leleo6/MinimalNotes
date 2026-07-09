/**
 * store.js — Abstración de persistencia y almacenamiento local.
 *
 * Principio OCP: La interfaz pública (load / save) permanece invariante.
 * Principio SRP: Su única responsabilidad es guardar y leer configuraciones/notas.
 *
 * FIX: Soluciona condición de carrera inicializando el Store usando una promesa cacheada (_storePromise).
 */

const STORE_FILE      = 'notes.json';
const NOTES_KEY       = 'notes-data';
const SETTINGS_KEY    = 'settings-data';
const WINDOWS_KEY     = 'windows-data';

/** @type {import('@tauri-apps/plugin-store').Store | null} */
let _store = null;
/** @type {Promise<import('@tauri-apps/plugin-store').Store> | null} */
let _storePromise = null;

/**
 * Obtiene la instancia singleton del Store de forma segura y concurrente.
 * @returns {Promise<import('@tauri-apps/plugin-store').Store>}
 */
async function getStore() {
  if (_store) return _store;
  if (_storePromise) return _storePromise;

  _storePromise = (async () => {
    try {
      let Store;
      if (window.__TAURI__ && window.__TAURI__.store) {
        Store = window.__TAURI__.store.Store;
      } else {
        const mod = await import('@tauri-apps/plugin-store');
        Store = mod.Store;
      }
      _store = await Store.load(STORE_FILE, { autoSave: false });
      return _store;
    } catch (err) {
      _storePromise = null; // Clear promise cache on error so we can retry next time
      throw err;
    }
  })();

  return _storePromise;
}

/**
 * Helper interno — persiste un valor en el store.
 * Reutilizado por saveToStore, saveSettingsToStore y saveWindowStates (DRY).
 * @param {string} key
 * @param {any} data
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
 * Reutilizado por loadFromStore, loadSettingsFromStore y loadWindowStates (DRY).
 * @param {string} key
 * @returns {Promise<any>}
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
 * Carga las notas persistidas.
 * @returns {Promise<object[] | null>}
 */
export async function loadFromStore() {
  return getStoreValue(NOTES_KEY);
}

/**
 * Persiste la lista de notas.
 * @param {object[]} notes
 */
export async function saveToStore(notes) {
  return setStoreValue(NOTES_KEY, notes);
}

// ─── Configuración ───────────────────────────────────────────────────────────

/**
 * Carga la configuración del usuario.
 * @returns {Promise<object | null>}
 */
export async function loadSettingsFromStore() {
  return getStoreValue(SETTINGS_KEY);
}

/**
 * Guarda la configuración del usuario.
 * @param {object} settings
 */
export async function saveSettingsToStore(settings) {
  return setStoreValue(SETTINGS_KEY, settings);
}

// ─── Window States ───────────────────────────────────────────────────────────

/**
 * Guarda las posiciones y geometría de las ventanas.
 * @param {object[]} states
 */
export async function saveWindowStates(states) {
  return setStoreValue(WINDOWS_KEY, states);
}

/**
 * Carga las posiciones y geometría de las ventanas.
 * @returns {Promise<object[] | null>}
 */
export async function loadWindowStates() {
  return getStoreValue(WINDOWS_KEY);
}
