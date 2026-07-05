import { setRemoteUpdate, getOpenWindows } from './windows.js';

export function registerSyncListeners(onSyncUpdate) {
  const openWindows = getOpenWindows();
  try {
    const { listen } = window.__TAURI__.event;

    listen('note-updated', ({ payload }) => {
      setRemoteUpdate(true);
      import('./state.js').then(({ updateNote, getActiveNote }) => {
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
        setRemoteUpdate(false);
      }).catch(() => {
        setRemoteUpdate(false);
      });
    });

    listen('note-deleted', ({ payload }) => {
      import('./state.js').then(({ removeNote, getNotes, setActiveId, getActiveId }) => {
        if (getNotes().some(n => n.id === payload.noteId)) {
          removeNote(payload.noteId);
          const remaining = getNotes();
          if (getActiveId() === payload.noteId) {
            setActiveId(remaining.length ? remaining[0].id : null);
          }
          if (onSyncUpdate) onSyncUpdate();
        }
      });
    });

    listen('note-created', ({ payload }) => {
      import('./state.js').then(({ addNote, getNotes }) => {
        if (!getNotes().some(n => n.id === payload.note.id)) {
          addNote(payload.note);
          if (onSyncUpdate) onSyncUpdate();
        }
      });
    });

    listen('window-note-opened', ({ payload }) => {
      openWindows.set(payload.label, { noteId: payload.noteId, zoom: 100 });
    });

    listen('window-note-closed', ({ payload }) => {
      openWindows.delete(payload.label);
    });
  } catch (_) {}
}
