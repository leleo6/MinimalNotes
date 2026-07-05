import { uid, debounce } from './utils.js';
import {
  addNote, removeNote, updateNote,
  setActiveId, sortByUpdated, getNotes, getRawNotes, getActiveNote
} from './state.js';
import { saveToStore } from './store.js';
import { isRemoteUpdate, emitNoteUpdated, emitNoteDeleted, emitNoteCreated } from './windows.js';

let _maxNotes = 10;
let _autoSave = false;

export function setNotesLimit(n) {
  _maxNotes = Math.max(2, n);
}

export function setAutoSave(enabled) {
  _autoSave = !!enabled;
}

export function createNoteShape(body = '', filePath = null) {
  return {
    id: uid(),
    body,
    updatedAt: Date.now(),
    filePath,
  };
}

const debouncedSave = debounce(async () => {
  sortByUpdated();
  await saveToStore(getRawNotes());

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

export async function createNote() {
  const unsaved = getNotes().filter(n => !n.filePath);
  if (unsaved.length >= _maxNotes) {
    const oldest = unsaved.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b));
    removeNote(oldest.id);
    emitNoteDeleted(oldest.id).catch(() => {});
  }

  const note = createNoteShape();
  addNote(note);
  setActiveId(note.id);
  // snapshot is handled by renderActiveEditor — no need to push here
  await saveToStore(getRawNotes());
  emitNoteCreated(note).catch(() => {});
  return note;
}

export async function deleteNote(id) {
  removeNote(id);
  const remaining = getNotes();
  setActiveId(remaining.length ? remaining[0].id : null);
  await saveToStore(getRawNotes());
  emitNoteDeleted(id).catch(() => {});
}

export function updateNoteBody(id, body) {
  updateNote(id, { body, updatedAt: Date.now() });
  debouncedSave();
  if (!isRemoteUpdate) {
    emitNoteUpdated(id, body).catch(() => {});
  }
}

export async function openFileFromSystem() {
  const { invoke } = window.__TAURI__.core;
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
    await saveToStore(getRawNotes());
    return note;
  } catch (err) {
    if (err !== 'Operación cancelada') {
      console.error('[notes] open file error:', err);
    }
    return null;
  }
}

export async function saveActiveNoteToSystem(note) {
  if (!note) return;
  const { invoke } = window.__TAURI__.core;
  try {
    if (note.filePath) {
      await invoke('save_file', { path: note.filePath, content: note.body });
    } else {
      const filePath = await invoke('save_file_as', { content: note.body });
      updateNote(note.id, { filePath, updatedAt: Date.now() });
      await saveToStore(getRawNotes());
    }
  } catch (err) {
    if (err !== 'Operación cancelada') {
      console.error('[notes] save file error:', err);
    }
  }
}
