const WINDOW_PREFIX = 'mn-note-';

const openWindows = new Map();
const positionSaveTimers = new Map();

export let isRemoteUpdate = false;

export function setRemoteUpdate(val) {
  isRemoteUpdate = val;
}

export function getWindowLabel(noteId) {
  return WINDOW_PREFIX + noteId;
}

export function registerCurrentWindow(noteId, zoom = 100) {
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    const label = getCurrentWindow().label;
    openWindows.set(label, { noteId, zoom });
    emitWindowNoteOpened(label, noteId);
    return label;
  } catch (_) {
    const label = 'main';
    openWindows.set(label, { noteId, zoom });
    return label;
  }
}

export function hasWindow(noteId) {
  for (const [, entry] of openWindows) {
    if (entry.noteId === noteId) return true;
  }
  return false;
}

export async function openNoteWindow(noteId) {
  for (const [label, entry] of openWindows) {
    if (entry.noteId === noteId) {
      try {
        const { WebviewWindow } = window.__TAURI__.webviewWindow;
        const win = WebviewWindow.getByLabel(label);
        if (win) await win.setFocus();
      } catch (_) {}
      return;
    }
  }

  const { uid } = await import('./utils.js');
  const label = getWindowLabel(noteId) + '-' + uid().slice(0, 6);
  const { getNotes } = await import('./state.js');
  const notes = getNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  const { WebviewWindow } = window.__TAURI__.webviewWindow;
  const title = note.body ? note.body.replace(/\n/g, ' ').trim().slice(0, 40) : 'Nota nueva';
  new WebviewWindow(label, {
    url: `index.html?noteId=${noteId}&window=${label}&notes=${encodeURIComponent(JSON.stringify(notes))}`,
    title: title || 'Nota nueva',
    width: 900, height: 600,
    minWidth: 320, minHeight: 240,
    resizable: true, decorations: true, center: true,
  });

  return label;
}

export async function openNewNoteWindow() {
  const { createNote } = await import('./notes.js');
  const note = await createNote();
  if (note) await openNoteWindow(note.id);
}

// ─── Event emitters ──────────────────────────────────────────────────────────

export async function emitNoteUpdated(noteId, body) {
  try {
    const { emit } = window.__TAURI__.event;
    await emit('note-updated', { noteId, body, updatedAt: Date.now() });
  } catch (_) {}
}

export async function emitNoteDeleted(noteId) {
  try {
    const { emit } = window.__TAURI__.event;
    await emit('note-deleted', { noteId });
  } catch (_) {}
}

export async function emitNoteCreated(note) {
  try {
    const { emit } = window.__TAURI__.event;
    await emit('note-created', { note });
  } catch (_) {}
}

function emitWindowNoteOpened(label, noteId) {
  try {
    window.__TAURI__.event.emit('window-note-opened', { label, noteId });
  } catch (_) {}
}

function emitWindowNoteClosed(label, noteId) {
  try {
    window.__TAURI__.event.emit('window-note-closed', { label, noteId });
  } catch (_) {}
}

// ─── Sync listeners ──────────────────────────────────────────────────────────

export function registerSyncListeners(onSyncUpdate) {
  try {
    const { listen } = window.__TAURI__.event;

    listen('note-updated', ({ payload }) => {
      isRemoteUpdate = true;
      import('./state.js').then(({ updateNote, getActiveNote }) => {
        updateNote(payload.noteId, { body: payload.body, updatedAt: payload.updatedAt });
        const active = getActiveNote();
        if (active && active.id === payload.noteId) {
          const input = document.getElementById('bodyInput');
          if (input && input.value !== payload.body) {
            const selStart = input.selectionStart;
            const selEnd = input.selectionEnd;
            input.value = payload.body;
            input.setSelectionRange(selStart, selEnd);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        isRemoteUpdate = false;
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

    // Sync openWindows across all windows
    listen('window-note-opened', ({ payload }) => {
      openWindows.set(payload.label, { noteId: payload.noteId, zoom: 100 });
    });

    listen('window-note-closed', ({ payload }) => {
      openWindows.delete(payload.label);
    });
  } catch (_) {}
}

// ─── Window state persistence ────────────────────────────────────────────────

export async function saveWindowState(label, noteId, zoom = 100) {
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    const win = getCurrentWindow();
    const pos = await win.outerPosition();
    const size = await win.outerSize();
    const { loadWindowStates, saveWindowStates } = await import('./store.js');

    const existing = (await loadWindowStates()) || [];
    const filtered = existing.filter(s => s.label !== label);
    filtered.push({
      label, noteId,
      x: pos.x, y: pos.y,
      width: size.width, height: size.height,
      zoom,
      url: `index.html?noteId=${noteId}&window=${label}`,
    });
    await saveWindowStates(filtered);
  } catch (_) {}
}

export function setupWindowStatePersistence(label, noteId) {
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    const win = getCurrentWindow();

    window.addEventListener('beforeunload', () => {
      openWindows.delete(label);
      emitWindowNoteClosed(label, noteId);
    });

    const savePos = () => {
      clearTimeout(positionSaveTimers.get(label));
      const tid = setTimeout(() => {
        saveWindowState(label, noteId);
      }, 1000);
      positionSaveTimers.set(label, tid);
    };

    win.listen('tauri://resize', savePos);
    win.listen('tauri://move', savePos);
  } catch (_) {}
}

export async function loadSavedWindowStates() {
  try {
    const { loadWindowStates } = await import('./store.js');
    const states = await loadWindowStates();
    return Array.isArray(states) ? states : [];
  } catch (_) {
    return [];
  }
}
