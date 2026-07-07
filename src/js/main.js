import { setNotes, setActiveId, getActiveNote, addNote, getNotes } from './state.js';
import { loadFromStore, loadSettingsFromStore, saveToStore } from './store.js';
import { createNote, createNoteShape, openFileFromSystem, saveActiveNoteToSystem } from './notes.js';
import { CONFIG_DEFAULTS, applyConfigToDOM } from './config.js';
import { renderSidebar }                              from './ui/sidebar.js';
import { renderEditor, changeZoom, resetZoom, zoomLevel } from './ui/editor.js';
import { renderTabbar }                               from './ui/tabbar.js';
import { toggleSearch }                               from './ui/search.js';
import { registerCurrentWindow, setupWindowStatePersistence, openNewNoteWindow } from './windows.js';
import { registerSyncListeners } from './sync.js';
import { undo, redo, lockRedoStack } from './history.js';
import { uid, showTemporalIndicator, getQueryParams } from './utils.js';

const callbacks = {
  async onNewNote() {
    await createNote();
    renderAll();
    requestAnimationFrame(() => {
      document.getElementById('bodyInput')?.focus();
    });
  },

  async onOpenFile() {
    const note = await openFileFromSystem();
    if (note) {
      renderAll();
    }
  },

  async onSaveNote() {
    await saveCurrentActiveNote();
  },

  onOpenSettings() {
    openSettingsWindow();
  },

  onSelectNote() {
    renderEditor(callbacks);
    renderSidebar(callbacks);
    renderTabbar(callbacks);
  },

  onDeleteNote() {
    renderAll();
  },

  onInput: (() => {
    let _inputTimer;
    return () => {
      renderSidebar(callbacks);
      clearTimeout(_inputTimer);
      _inputTimer = setTimeout(() => renderTabbar(callbacks), 400);
    };
  })(),

  onToggleSearch() {
    toggleSearch();
  },
};

async function saveCurrentActiveNote() {
  const activeNote = getActiveNote();
  if (activeNote) {
    await saveActiveNoteToSystem(activeNote);
    showTemporalIndicator(document.getElementById('saveIndicator'));
  }
}

function renderAll() {
  renderSidebar(callbacks);
  renderTabbar(callbacks);
  renderEditor(callbacks);
  applyConfigToDOM(currentConfig);
  attachScrollListeners();
}

function attachScrollListeners() {
  document.querySelectorAll('.editor-scroll, .spine').forEach(el => {
    if (el._scrollHandler) return;

    el._scrollHandler = () => {
      el.classList.add('scrolling');
      clearTimeout(el._scrollTimer);
      el._scrollTimer = setTimeout(() => {
        el.classList.remove('scrolling');
      }, 800);
    };

    el.addEventListener('scroll', el._scrollHandler);
  });
}

function applyHistory(historyFn) {
  const active = getActiveNote();
  if (!active) return;
  const val = historyFn(active.id);
  if (val === null) return;
  const input = document.getElementById('bodyInput');
  if (!input) return;
  lockRedoStack(active.id);
  input.value = val;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const SHORTCUT_ACTIONS = {
  newNote:      { handler: async () => { await openNewNoteWindow(); renderAll(); } },
  openFile:     { handler: async () => { await callbacks.onOpenFile(); } },
  saveNote:     { handler: async () => { await saveCurrentActiveNote(); } },
  undo:         { handler: async () => { applyHistory(undo); } },
  redo:         { handler: async () => { applyHistory(redo); } },
  zoomIn:       { handler: () => changeZoom(10) },
  zoomOut:      { handler: () => changeZoom(-10) },
  resetZoom:    { handler: () => resetZoom() },
  toggleSearch: { handler: () => toggleSearch() },
};

let _keydownHandler = null;
let _wheelHandler = null;

function registerKeyboardShortcuts() {
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
  }
  if (_wheelHandler) {
    document.removeEventListener('wheel', _wheelHandler);
  }

  _keydownHandler = async (e) => {
    for (const [action, entry] of Object.entries(SHORTCUT_ACTIONS)) {
      const sc = currentConfig.shortcuts?.[action];
      if (!sc) continue;

      const mods = sc.modifiers;
      const modMatch = (mods.ctrl  === (e.ctrlKey || e.metaKey)) &&
                       (mods.alt   === e.altKey) &&
                       (mods.shift === e.shiftKey);
      if (!modMatch) continue;

      const keys = Array.isArray(sc.key) ? sc.key : [sc.key];
      if (keys.includes(e.key)) {
        e.preventDefault();
        await entry.handler();
        return;
      }
    }
  };

  document.addEventListener('keydown', _keydownHandler);

  _wheelHandler = (e) => {
    if (e.ctrlKey || e.metaKey) {
      changeZoom(e.deltaY < 0 ? 5 : -5);
    }
  };
  document.addEventListener('wheel', _wheelHandler);
}

async function handleOpenFilePayload(payload) {
  if (!payload || !payload.path) return;
  const { path: filePath, content, is_new: isNew } = payload;
  const existing = getNotes().find(n => n.filePath === filePath);
  let note;
  if (existing) {
    existing.body = content;
    existing.updatedAt = Date.now();
    setActiveId(existing.id);
    note = existing;
  } else {
    note = createNoteShape(content, filePath);
    addNote(note);
    setActiveId(note.id);
  }
  await saveToStore(getNotes());
  if (isNew) {
    const { message } = window.__TAURI__.dialog;
    await message(`La ruta '${filePath}' no existe.\nSe creará un nuevo archivo al guardar.`, {
      title: 'Nuevo archivo',
      kind: 'info'
    });
  }
}

async function init() {
  const loadedConfig = await loadSettingsFromStore();
  if (loadedConfig) {
    currentConfig = { ...CONFIG_DEFAULTS, ...loadedConfig };
  }
  applyConfigToDOM(currentConfig);

  try {
    window.__TAURI__.event.listen('settings-changed', async ({ payload }) => {
      currentConfig = { ...CONFIG_DEFAULTS, ...payload };
      applyConfigToDOM(currentConfig);
      registerKeyboardShortcuts();
    });
  } catch (_) {}

  const params = getQueryParams();
  let saved = null;
  try {
    const notesParam = params.get('notes');
    if (notesParam) {
      saved = JSON.parse(decodeURIComponent(notesParam));
    }
  } catch (_) {}
  if (!saved || !Array.isArray(saved)) {
    saved = await loadFromStore();
  }
  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    saved = [{
      id: uid(),
      body: '',
      updatedAt: Date.now(),
      filePath: null,
    }];
  }

  saved.sort((a, b) => b.updatedAt - a.updatedAt);
  setNotes(saved);

  let initialNoteId = params.get('noteId');
  if (!initialNoteId || !saved.find(n => n.id === initialNoteId)) {
    initialNoteId = saved[0].id;
  }
  setActiveId(initialNoteId);

  try {
    const cliData = await window.__TAURI__.core.invoke('get_startup_file');
    if (cliData) {
      await handleOpenFilePayload(cliData);
    }
  } catch (_) {}

  if (window.__CLI_DATA__) {
    await handleOpenFilePayload(window.__CLI_DATA__);
    delete window.__CLI_DATA__;
  }

  const activeNote = getActiveNote();
  if (activeNote) {
    initialNoteId = activeNote.id;
  }

  let windowLabel = params.get('window') || getCurrentWindowLabel();

  registerCurrentWindow(initialNoteId, zoomLevel);

  setupWindowStatePersistence(windowLabel, initialNoteId);

  registerSyncListeners(() => {
    renderAll();
  });

  try {
    window.__TAURI__.event.listen('open-cli-file', async (event) => {
      await handleOpenFilePayload(event.payload);
      renderAll();
    });
  } catch (_) {}

  registerKeyboardShortcuts();
  renderAll();
}

function getCurrentWindowLabel() {
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    return getCurrentWindow().label;
  } catch (_) {
    return 'main';
  }
}

let currentConfig = { ...CONFIG_DEFAULTS };

init();

let _settingsWin = null;

function openSettingsWindow() {
  const { WebviewWindow } = window.__TAURI__.webviewWindow;

  if (_settingsWin) {
    _settingsWin.setFocus().catch(() => {
      _settingsWin = null;
      openSettingsWindow();
    });
    return;
  }

  const q = new URLSearchParams({
    fontSize:    currentConfig.fontSize,
    lineHeight:  currentConfig.lineHeight,
    fontFamily:  currentConfig.fontFamily,
    theme:       currentConfig.theme,
    editorWidth: currentConfig.editorWidth,
    placeholder: currentConfig.placeholder,
    maxNotes:    currentConfig.maxNotes,
    autoSave:    currentConfig.autoSave,
    showTabbar:  currentConfig.showTabbar,
    shortcuts:   JSON.stringify(currentConfig.shortcuts || {}),
  }).toString();

  _settingsWin = new WebviewWindow('settings', {
    url: 'settings.html?' + q,
    title: 'Configuración — MinimalNotes',
    width: 440,
    height: 600,
    resizable: false,
    center: true,
    decorations: true
  });

  _settingsWin.once('tauri://destroyed', () => {
    _settingsWin = null;
  });
}
