/**
 * notes.js — Lógica de negocio de notas (crear, eliminar, abrir y guardar en disco).
 * 
 * Principio SRP: Responsable exclusivo de las operaciones de negocio de notas y coordinación con el store.
 * Principio DIP: Utiliza el adaptador ipc.js para operaciones nativas.
 */

import { uid, debounce } from './utils.js';
import {
  addNote, removeNote, updateNote,
  setActiveId, sortByUpdated, getNotes, getActiveNote
} from './state.js';
import { saveToStore } from './store.js';
import { clearHistory } from './history.js';
import { invoke } from './ipc.js';
import { 
  isRemoteUpdate, 
  emitNoteUpdated, 
  emitNoteDeleted, 
  emitNoteCreated, 
  openNoteWindow 
} from './windows.js';

let _maxNotes = 10;
let _autoSave = false;

/**
 * Define el límite máximo de notas sin guardar que se mantienen abiertas.
 * @param {number} n 
 */
export function setNotesLimit(n) {
  _maxNotes = Math.max(2, n);
}

/**
 * Activa o desactiva el guardado automático de archivos del sistema.
 * @param {boolean} enabled 
 */
export function setAutoSave(enabled) {
  _autoSave = !!enabled;
}

/**
 * Crea el objeto base para representar una nota.
 * @param {string} body 
 * @param {string|null} filePath 
 * @returns {object}
 */
export function createNoteShape(body = '', filePath = null) {
  return {
    id: uid(),
    body,
    updatedAt: Date.now(),
    filePath,
  };
}

/**
 * Guardado diferido (debounced) de notas en disco y store.
 * Emite eventos 'save-status' para reflejar el estado en la UI.
 */
const debouncedSave = debounce(async () => {
  sortByUpdated();
  
  // Informar que el guardado está en curso
  window.dispatchEvent(new CustomEvent('save-status', { detail: { saving: true } }));
  
  await saveToStore(getNotes());

  if (_autoSave) {
    const activeNote = getActiveNote();
    if (activeNote && activeNote.filePath) {
      try {
        await invoke('save_file', { path: activeNote.filePath, content: activeNote.body });
      } catch (err) {
        console.error('[notes] auto-save file error:', err);
      }
    }
  }

  // Informar que el guardado se ha completado
  window.dispatchEvent(new CustomEvent('save-status', { detail: { saving: false } }));
}, 500);

/**
 * Crea una nueva nota limpia respetando el límite establecido.
 * @returns {Promise<object>}
 */
export async function createNote() {
  const unsaved = getNotes().filter(n => !n.filePath);
  if (unsaved.length >= _maxNotes) {
    const oldest = unsaved.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b));
    removeNote(oldest.id);
    clearHistory(oldest.id); // FIX: Eliminar el historial para evitar leaks
    emitNoteDeleted(oldest.id).catch(() => {});
  }

  const note = createNoteShape();
  addNote(note);
  setActiveId(note.id);
  await saveToStore(getNotes());
  emitNoteCreated(note).catch(() => {});
  return note;
}

/**
 * Elimina una nota por su ID y limpia su historial.
 * @param {string} id 
 */
export async function deleteNote(id) {
  removeNote(id);
  clearHistory(id); // FIX: Limpiar historial asociado para evitar fugas de memoria
  const remaining = getNotes();
  setActiveId(remaining.length ? remaining[0].id : null);
  await saveToStore(getNotes());
  emitNoteDeleted(id).catch(() => {});
}

/**
 * Actualiza el texto de una nota y programa un guardado.
 * @param {string} id 
 * @param {string} body 
 */
export function updateNoteBody(id, body) {
  updateNote(id, { body, updatedAt: Date.now() });
  
  // Informar de manera inmediata que hay cambios pendientes de guardarse
  window.dispatchEvent(new CustomEvent('save-status', { detail: { saving: true } }));
  
  debouncedSave();
  
  if (!isRemoteUpdate) {
    emitNoteUpdated(id, body).catch(() => {});
  }
}

/**
 * Abre una ventana nueva para la nota que se acaba de crear (relocalizado para romper ciclos).
 */
export async function openNewNoteWindow() {
  const note = await createNote();
  if (note) await openNoteWindow(note.id);
}

/**
 * Muestra el diálogo del sistema para cargar un archivo y lo importa.
 * @returns {Promise<object|null>}
 */
export async function openFileFromSystem() {
  try {
    const [filePath, content] = await invoke('open_file');

    const existing = getNotes().find(n => n.filePath === filePath);
    if (existing) {
      setActiveId(existing.id);
      return existing;
    }

    const note = createNoteShape(content, filePath);
    addNote(note);
    setActiveId(note.id);
    await saveToStore(getNotes());
    return note;
  } catch (err) {
    if (err !== 'Operación cancelada') {
      console.error('[notes] open file error:', err);
    }
    return null;
  }
}

/**
 * Guarda la nota activa en el sistema de archivos (con "Guardar como" si no tiene ruta).
 * @param {object} note 
 */
export async function saveActiveNoteToSystem(note) {
  if (!note) return;
  try {
    if (note.filePath) {
      await invoke('save_file', { path: note.filePath, content: note.body });
    } else {
      const filePath = await invoke('save_file_as', { content: note.body });
      updateNote(note.id, { filePath, updatedAt: Date.now() });
      await saveToStore(getNotes());
    }
  } catch (err) {
    if (err !== 'Operación cancelada') {
      console.error('[notes] save file error:', err);
    }
  }
}
