/**
 * windows.js — Gestión de ventanas Webview y su posicionamiento/geometría.
 * 
 * Principio SRP: Responsable único de abrir, enfocar y registrar la geometría de las ventanas secundarias.
 * Principio DIP: Delegar la integración directa con Tauri a ipc.js.
 */

import { 
  emit, 
  getCurrentWindowLabel, 
  setWindowFocus, 
  createWebviewWindow, 
  getWindowPosition, 
  getWindowSize, 
  listenToWindow 
} from './ipc.js';
import { uid } from './utils.js';
import { getNotes } from './state.js';
import { loadWindowStates, saveWindowStates } from './store.js';

const WINDOW_PREFIX = 'mn-note-';
const openWindows = new Map();
const positionSaveTimers = new Map();

export let isRemoteUpdate = false;

/**
 * Establece si la actualización actual proviene de otra ventana (para evitar bucles infinitos).
 * @param {boolean} val 
 */
export function setRemoteUpdate(val) {
  isRemoteUpdate = val;
}

/**
 * Obtiene el mapa de ventanas abiertas.
 * @returns {Map<string, {noteId: string, zoom: number}>}
 */
export function getOpenWindows() {
  return openWindows;
}

/**
 * Obtiene la etiqueta estándar para una ventana de nota.
 * @param {string} noteId 
 * @returns {string}
 */
export function getWindowLabel(noteId) {
  return WINDOW_PREFIX + noteId;
}

export async function emitNoteUpdated(noteId, body) {
  emit('note-updated', { noteId, body, updatedAt: Date.now() });
}

export async function emitNoteDeleted(noteId) {
  emit('note-deleted', { noteId });
}

export async function emitNoteCreated(note) {
  emit('note-created', { note });
}

export function emitWindowNoteOpened(label, noteId) {
  emit('window-note-opened', { label, noteId });
}

export function emitWindowNoteClosed(label, noteId) {
  emit('window-note-closed', { label, noteId });
}

/**
 * Registra la ventana actual en la memoria del módulo.
 */
export function registerCurrentWindow(noteId, zoom = 100) {
  const label = getCurrentWindowLabel();
  openWindows.set(label, { noteId, zoom });
  emitWindowNoteOpened(label, noteId);
  return label;
}

/**
 * Verifica si una nota ya está abierta en alguna ventana.
 * @param {string} noteId 
 * @returns {boolean}
 */
export function hasWindow(noteId) {
  for (const [, entry] of openWindows) {
    if (entry.noteId === noteId) return true;
  }
  return false;
}

/**
 * Abre una ventana independiente para una nota específica.
 * Si ya existe una ventana para esa nota, le otorga el foco.
 * @param {string} noteId 
 */
export async function openNoteWindow(noteId) {
  for (const [label, entry] of openWindows) {
    if (entry.noteId === noteId) {
      await setWindowFocus(label);
      return;
    }
  }

  const label = getWindowLabel(noteId) + '-' + uid().slice(0, 6);
  const notes = getNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  const title = note.body ? note.body.replace(/\n/g, ' ').trim().slice(0, 40) : 'Nota nueva';
  
  createWebviewWindow(label, {
    url: `index.html?noteId=${noteId}&window=${label}`,
    title: title || 'Nota nueva',
    width: 900,
    height: 600,
    minWidth: 320,
    minHeight: 240,
    resizable: true,
    decorations: true,
    center: true,
  });

  return label;
}

/**
 * Guarda las coordenadas geométricas y zoom de la ventana.
 */
export async function saveWindowState(label, noteId, zoom) {
  try {
    const pos = await getWindowPosition();
    const size = await getWindowSize();
    const actualZoom = zoom ?? openWindows.get(label)?.zoom ?? 100;

    const existing = (await loadWindowStates()) || [];
    const filtered = existing.filter(s => s.label !== label);
    filtered.push({
      label, 
      noteId,
      x: pos.x, 
      y: pos.y,
      width: size.width, 
      height: size.height,
      zoom: actualZoom,
      url: `index.html?noteId=${noteId}&window=${label}`,
    });
    await saveWindowStates(filtered);
  } catch (_) {}
}

/**
 * Suscribe eventos de resize/move para guardar la posición de la ventana.
 */
export function setupWindowStatePersistence(label, noteId) {
  try {
    window.addEventListener('beforeunload', () => {
      openWindows.delete(label);
      emitWindowNoteClosed(label, noteId);
      try {
        const key = 'mn-closed-window';
        const closed = JSON.parse(localStorage.getItem(key) || '[]');
        closed.push({ label, noteId, timestamp: Date.now() });
        localStorage.setItem(key, JSON.stringify(closed));
      } catch (_) {}
    });

    const savePos = () => {
      clearTimeout(positionSaveTimers.get(label));
      const tid = setTimeout(() => {
        saveWindowState(label, noteId);
      }, 1000);
      positionSaveTimers.set(label, tid);
    };

    listenToWindow('tauri://resize', savePos);
    listenToWindow('tauri://move', savePos);
  } catch (_) {}
}

/**
 * Carga el estado de ventanas guardado.
 * @returns {Promise<object[]>}
 */
export async function loadSavedWindowStates() {
  try {
    const states = await loadWindowStates();
    return Array.isArray(states) ? states : [];
  } catch (_) {
    return [];
  }
}
