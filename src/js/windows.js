const WINDOW_PREFIX = 'mn-note-';
const openWindows = new Map();
const positionSaveTimers = new Map();

export let isRemoteUpdate = false;

export function setRemoteUpdate(val) {
  isRemoteUpdate = val;
}

export function getOpenWindows() {
  return openWindows;
}

export function getWindowLabel(noteId) {
  return WINDOW_PREFIX + noteId;
}

function safeEmit(event, payload) {
  try {
    window.__TAURI__.event.emit(event, payload);
  } catch (_) {}
}

export async function emitNoteUpdated(noteId, body) {
  safeEmit('note-updated', { noteId, body, updatedAt: Date.now() });
}

export async function emitNoteDeleted(noteId) {
  safeEmit('note-deleted', { noteId });
}

export async function emitNoteCreated(note) {
  safeEmit('note-created', { note });
}

export function emitWindowNoteOpened(label, noteId) {
  safeEmit('window-note-opened', { label, noteId });
}

export function emitWindowNoteClosed(label, noteId) {
  safeEmit('window-note-closed', { label, noteId });
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
