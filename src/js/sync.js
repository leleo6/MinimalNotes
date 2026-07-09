/**
 * sync.js — Sincronización de estado entre ventanas independientes de la aplicación.
 * 
 * Principio SRP: Responsable único de recibir notificaciones IPC y mantener sincronizado el estado.
 * Principio DRY/Clean Code: Utiliza importaciones estáticas y la abstracción central de ipc.js.
 */

import { setRemoteUpdate, getOpenWindows } from './windows.js';
import { listen } from './ipc.js';
import { 
  updateNote, 
  getActiveNote, 
  removeNote, 
  getNotes, 
  setActiveId, 
  getActiveId, 
  addNote 
} from './state.js';
import { clearHistory } from './history.js';

/**
 * Registra listeners globales para mantener sincronizadas múltiples ventanas de la aplicación.
 * @param {function} onSyncUpdate Callback gatillado tras una sincronización de notas
 */
export function registerSyncListeners(onSyncUpdate) {
  const openWindows = getOpenWindows();
  
  // Sincronizar cambios de contenido de notas
  listen('note-updated', ({ payload }) => {
    setRemoteUpdate(true);
    try {
      updateNote(payload.noteId, { body: payload.body, updatedAt: payload.updatedAt });
      const active = getActiveNote();
      if (active && active.id === payload.noteId) {
        const input = document.getElementById('bodyInput');
        if (input && input.value !== payload.body) {
          const selStart = input.selectionStart;
          const selEnd = input.selectionEnd;
          input.value = payload.body;
          const newLen = payload.body.length;
          input.setSelectionRange(Math.min(selStart, newLen), Math.min(selEnd, newLen));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    } finally {
      setRemoteUpdate(false);
    }
  });

  // Sincronizar eliminación de notas
  listen('note-deleted', ({ payload }) => {
    if (getNotes().some(n => n.id === payload.noteId)) {
      removeNote(payload.noteId);
      clearHistory(payload.noteId); // FIX: Eliminar el historial para prevenir leaks en ventanas inactivas
      const remaining = getNotes();
      if (getActiveId() === payload.noteId) {
        setActiveId(remaining.length ? remaining[0].id : null);
      }
      if (onSyncUpdate) onSyncUpdate();
    }
  });

  // Sincronizar creación de notas
  listen('note-created', ({ payload }) => {
    if (!getNotes().some(n => n.id === payload.note.id)) {
      addNote(payload.note);
      if (onSyncUpdate) onSyncUpdate();
    }
  });

  // Rastrear ventanas abiertas
  listen('window-note-opened', ({ payload }) => {
    openWindows.set(payload.label, { noteId: payload.noteId, zoom: 100 });
  });

  // Rastrear ventanas cerradas
  listen('window-note-closed', ({ payload }) => {
    openWindows.delete(payload.label);
  });
}
