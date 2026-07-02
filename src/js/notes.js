/**
 * notes.js — CRUD de notas.
 *
 * Principio SRP: solo gestiona la lógica de negocio de las
 * notas (crear, eliminar, actualizar). No sabe nada de DOM
 * ni de cómo se persisten los datos.
 *
 * Principio DRY: createNote genera la estructura canónica de
 * una nota; nunca se construye en otro lugar.
 */

import { uid, debounce } from './utils.js';
import {
  addNote, removeNote, updateNote,
  setActiveId, sortByUpdated, getNotes, getActiveNote
} from './state.js';
import { saveToStore } from './store.js';

/** Límite de notas sin guardar en caché (configurable desde settings). */
let _maxNotes = 10;

let _autoSave = false;

/**
 * Actualiza el límite de notas en caché.
 * Se llama desde main.js cada vez que cambia la configuración.
 * @param {number} n
 */
export function setNotesLimit(n) {
  _maxNotes = Math.max(2, n);
}

/**
 * Activa o desactiva el guardado automático de archivos físicos.
 * @param {boolean} enabled
 */
export function setAutoSave(enabled) {
  _autoSave = !!enabled;
}

/** Debounce de guardado: 500 ms después del último cambio. */
const debouncedSave = debounce(async () => {
  sortByUpdated();
  const notes = getNotes();
  await saveToStore(notes);

  // Si el guardado automático de archivos físicos está activo y la nota tiene archivo físico, guardar
  if (_autoSave) {
    const activeNote = getActiveNote();
    if (activeNote && activeNote.filePath) {
      try {
        const { invoke } = window.__TAURI__.core;
        await invoke('save_file', { path: activeNote.filePath, content: activeNote.body });
      } catch (err) {
        console.error('[notes] auto-save file error:', err);
      }
    }
  }
}, 500);

/**
 * Crea una nota nueva vacía y la activa.
 * @returns {{ id: string, body: string, updatedAt: number, filePath: string | null }}
 */
export function createNote() {
  // Hacer cumplir el límite de notas en caché:
  // Si las notas sin filePath ya alcanzan el máximo, eliminar la más antigua.
  const unsaved = getNotes().filter(n => !n.filePath);
  if (unsaved.length >= _maxNotes) {
    const oldest = unsaved.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b));
    removeNote(oldest.id);
  }

  const note = {
    id:        uid(),
    body:      '',
    updatedAt: Date.now(),
    filePath:  null,
  };
  addNote(note);
  setActiveId(note.id);
  saveToStore(getNotes()); // guardado inmediato al crear
  return note;
}

/**
 * Elimina una nota por ID y ajusta el activeId al siguiente disponible.
 * @param {string} id
 */
export async function deleteNote(id) {
  removeNote(id);
  const remaining = getNotes();
  setActiveId(remaining.length ? remaining[0].id : null);
  await saveToStore(remaining);
}

/**
 * Actualiza el cuerpo de la nota activa y encola el guardado.
 * @param {string} id
 * @param {string} body
 */
export function updateNoteBody(id, body) {
  updateNote(id, { body, updatedAt: Date.now() });
  debouncedSave();
}

/**
 * Abre un archivo a través del diálogo de Tauri y lo agrega al listado.
 * Si el archivo ya estaba abierto, solo lo activa.
 * @returns {Promise<object|null>}
 */
export async function openFileFromSystem() {
  const { invoke } = window.__TAURI__.core;
  try {
    const [filePath, content] = await invoke('open_file');

    // Comprobar si ya existe una nota con esa misma ruta física
    const existing = getNotes().find(n => n.filePath === filePath);
    if (existing) {
      setActiveId(existing.id);
      return existing;
    }

    // Crear nota cargando el archivo físico
    const note = {
      id:        uid(),
      body:      content,
      updatedAt: Date.now(),
      filePath:  filePath,
    };
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
 * Guarda la nota activa físicamente en el disco.
 * Si no está vinculada a ningún archivo, abre el diálogo "Guardar como".
 * @param {object} note
 * @returns {Promise<void>}
 */
export async function saveActiveNoteToSystem(note) {
  if (!note) return;
  const { invoke } = window.__TAURI__.core;
  try {
    if (note.filePath) {
      // Escribir directamente en el archivo
      await invoke('save_file', { path: note.filePath, content: note.body });
    } else {
      // Abrir diálogo de guardado
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
