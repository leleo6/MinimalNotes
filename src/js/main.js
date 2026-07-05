/**
 * main.js — Punto de entrada e inicialización de la app.
 *
 * Principio SRP: su única responsabilidad es ensamblar los
 * módulos, cargar el estado inicial y registrar los atajos
 * de teclado globales.
 *
 * Principio DRY: las funciones render* son los únicos lugares
 * desde donde se actualiza la UI. Todos los callbacks los
 * invocan en lugar de duplicar la lógica de renderizado.
 */

import { setNotes, setActiveId, getActiveNote } from './state.js';
import { loadFromStore, loadSettingsFromStore, saveSettingsToStore } from './store.js';
import { createNote, openFileFromSystem, saveActiveNoteToSystem } from './notes.js';
import { CONFIG_DEFAULTS, applyConfigToDOM } from './config.js';
import { renderSidebar }                              from './ui/sidebar.js';
import { renderEditor, changeZoom, resetZoom }        from './ui/editor.js';
import { renderTabbar }                               from './ui/tabbar.js';
import { toggleSearch }                               from './ui/search.js';
import { registerCurrentWindow, registerSyncListeners, setupWindowStatePersistence, openNewNoteWindow, openNoteWindow } from './windows.js';
import { undo, redo }                                 from './history.js';
import { uid }                                        from './utils.js';

// ---------- Callbacks compartidos (DRY: definidos una sola vez) ----------

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

// ---------- Guardado físico de archivo (DRY) ----------

async function saveCurrentActiveNote() {
  const activeNote = getActiveNote();
  if (activeNote) {
    await saveActiveNoteToSystem(activeNote);
    // Visual confirmation in the footer
    const saveEl = document.getElementById('saveIndicator');
    if (saveEl) {
      saveEl.classList.add('visible');
      clearTimeout(saveEl._hideTimer);
      saveEl._hideTimer = setTimeout(() => saveEl.classList.remove('visible'), 1800);
    }
  }
}

// ---------- Render principal ----------

function renderAll() {
  renderSidebar(callbacks);
  renderTabbar(callbacks);
  renderEditor(callbacks);
  applyConfigToDOM(currentConfig);
  attachScrollListeners();
}

// ---------- Scrollbar auto-hide ----------

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

// ---------- Atajos de teclado globales ----------
// Principio OCP: los atajos se registran como datos en un array;
// agregar uno nuevo no requiere modificar la lógica de dispatch.

function applyHistory(historyFn) {
  const active = getActiveNote();
  if (!active) return;
  const val = historyFn(active.id);
  if (val === null) return;
  const input = document.getElementById('bodyInput');
  if (!input) return;
  input.value = val;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const SHORTCUTS = [
  { key: 'n',                       handler: async () => { await openNewNoteWindow(); renderAll(); } },
  { key: 'o',                       handler: async () => { await callbacks.onOpenFile(); } },
  { key: 's',                       handler: async () => { await saveCurrentActiveNote(); } },
  { key: 'z',                       handler: async () => { applyHistory(undo); } },
  { key: 'y',                       handler: async () => { applyHistory(redo); } },
  { key: ['=', '+'],                handler: () => changeZoom(10) },
  { key: '-',                       handler: () => changeZoom(-10) },
  { key: '0',                       handler: () => resetZoom() },
  { key: 'h',                       handler: () => toggleSearch() },
];

function registerKeyboardShortcuts() {
  document.addEventListener('keydown', async e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    for (const sc of SHORTCUTS) {
      const keys = Array.isArray(sc.key) ? sc.key : [sc.key];
      if (keys.includes(e.key)) {
        e.preventDefault();
        await sc.handler();
        return;
      }
    }
  });

  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      changeZoom(e.deltaY < 0 ? 5 : -5);
    }
  }, { passive: false });
}

// ---------- Inicialización ----------

async function init() {
  // Cargar configuración de la app
  const loadedConfig = await loadSettingsFromStore();
  if (loadedConfig) {
    currentConfig = { ...CONFIG_DEFAULTS, ...loadedConfig };
  }
  applyConfigToDOM(currentConfig);

  // Escuchar eventos globales de configuración
  try {
    window.__TAURI__.event.listen('settings-changed', async ({ payload }) => {
      currentConfig = { ...CONFIG_DEFAULTS, ...payload };
      applyConfigToDOM(currentConfig);
      await saveSettingsToStore(currentConfig);
    });
  } catch (_) {}

  // Cargar notas: desde URL param (nueva ventana) o desde store
  let saved = null;
  try {
    const notesParam = new URLSearchParams(window.location.search).get('notes');
    if (notesParam) {
      saved = JSON.parse(decodeURIComponent(notesParam));
    }
  } catch (_) {}
  if (!saved || !Array.isArray(saved)) {
    saved = await loadFromStore();
  }
  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    saved = [{
      id:        uid(),
      body:      '',
      updatedAt: Date.now(),
      filePath:  null,
    }];
  }

  saved.sort((a, b) => b.updatedAt - a.updatedAt);
  setNotes(saved);

  // Determinar qué nota mostrar: desde URL param o la más reciente
  let initialNoteId = null;
  try {
    const params = new URLSearchParams(window.location.search);
    initialNoteId = params.get('noteId');
  } catch (_) {}
  if (!initialNoteId || !saved.find(n => n.id === initialNoteId)) {
    initialNoteId = saved[0].id;
  }
  setActiveId(initialNoteId);

  // Registrar esta ventana en el gestor de ventanas
  let windowLabel = 'main';
  try {
    const params = new URLSearchParams(window.location.search);
    windowLabel = params.get('window') || getCurrentWindowLabel();
  } catch (_) {}
  registerCurrentWindow(initialNoteId, 100);

  // Registrar persistencia de estado de ventana
  setupWindowStatePersistence(windowLabel, initialNoteId);

  // Registrar listeners de sincronización multi-ventana
  registerSyncListeners(() => {
    renderAll();
  });

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

// ---------- Inicialización ----------

init();

// ---------- Ventana secundaria independiente ----------
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

  // Codificar los parámetros de configuración actuales en la URL de la ventana
  const q = new URLSearchParams({
    fontSize:    currentConfig.fontSize,
    lineHeight:  currentConfig.lineHeight,
    fontFamily:  currentConfig.fontFamily,
    theme:       currentConfig.theme,
    editorWidth: currentConfig.editorWidth,
    placeholder: currentConfig.placeholder,
    maxNotes:    currentConfig.maxNotes,
    autoSave:    currentConfig.autoSave,
    showTabbar:  currentConfig.showTabbar
  }).toString();

  _settingsWin = new WebviewWindow('settings', {
    url: 'settings.html?' + q,
    title: 'Configuración — MinimalNotes',
    width: 440,
    height: 480,
    resizable: false,
    center: true,
    decorations: true
  });

  _settingsWin.once('tauri://destroyed', () => {
    _settingsWin = null;
  });
}
