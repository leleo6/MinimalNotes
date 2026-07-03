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
import { createNote, openFileFromSystem, saveActiveNoteToSystem, setNotesLimit, setAutoSave } from './notes.js';
import { renderSidebar }                                  from './ui/sidebar.js';
import { renderEditor }                                   from './ui/editor.js';
import { uid }                                            from './utils.js';

// ---------- Callbacks compartidos (DRY: definidos una sola vez) ----------

const callbacks = {
  onNewNote() {
    createNote();
    renderAll();
    // Enfocar el textarea en el siguiente tick
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
    // Solo re-renderizar editor y spine dots (la lista ya tiene el estado correcto)
    renderEditor(callbacks);
    renderSidebar(callbacks);
  },

  onDeleteNote() {
    renderAll();
  },

  onInput() {
    // Refrescar solo la lista y los dots (sin re-montar el editor)
    renderSidebar(callbacks);
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
  renderEditor(callbacks);
  applyConfigToDOM(currentConfig);
}

// ---------- Atajos de teclado globales ----------

function registerKeyboardShortcuts() {
  document.addEventListener('keydown', async e => {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'n') {
      e.preventDefault();
      callbacks.onNewNote();
    }
    if (ctrl && e.key === 'o') {
      e.preventDefault();
      await callbacks.onOpenFile();
    }
    if (ctrl && e.key === 's') {
      e.preventDefault();
      await saveCurrentActiveNote();
    }
  });
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
  window.__TAURI__.event.listen('settings-changed', async ({ payload }) => {
    currentConfig = { ...CONFIG_DEFAULTS, ...payload };
    applyConfigToDOM(currentConfig);
    await saveSettingsToStore(currentConfig);
  });

  // Cargar notas persistidas
  let saved = await loadFromStore();

  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    // Nota inicial vacía por defecto
    saved = [{
      id:        uid(),
      body:      '',
      updatedAt: Date.now(),
      filePath:  null,
    }];
  }

  // Ordenar por más reciente y activar la primera
  saved.sort((a, b) => b.updatedAt - a.updatedAt);
  setNotes(saved);
  setActiveId(saved[0].id);

  registerKeyboardShortcuts();
  renderAll();
}

// ---------- Configuración por defecto ----------
// IMPORTANTE: declarado ANTES de init() para evitar Temporal Dead Zone
// (let/const no tienen hoisting de valor — usará undefined si se llama
// init() antes de la declaración).
const CONFIG_DEFAULTS = {
  fontSize:    16,
  lineHeight:  1.8,
  fontFamily:  'system',
  theme:       'light',
  editorWidth: 'none',
  placeholder: 'Escribe algo…',
  maxNotes:    10,
  autoSave:    false,
};

let currentConfig = { ...CONFIG_DEFAULTS };

// ---------- Inicialización ----------

init();

// ---------- Aplicar configuraciones en caliente ----------
const FONT_MAP = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  serif:  "'Lora', Georgia, serif",
  mono:   "'JetBrains Mono', monospace",
};

const THEME_BG = {
  light: '#F6F5F0',
  dark:  '#181816',
  sepia: '#F1E7D0',
};

function applyConfigToDOM(config) {
  // Guardar en la etiqueta HTML el tema activo
  const theme = config.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mn-theme', theme);

  // Sincronizar el fondo de la ventana nativa para evitar bloques negros al redimensionar
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    getCurrentWindow().setBackgroundColor(THEME_BG[theme] || THEME_BG.light);
  } catch (_) {}

  // Ajustar estilos en caliente en el editor si está visible
  const body = document.getElementById('bodyInput');
  const wrap = document.querySelector('.editor-body-wrap');

  if (body) {
    body.style.fontSize   = config.fontSize + 'px';
    body.style.lineHeight = String(config.lineHeight);
    if (config.fontFamily && FONT_MAP[config.fontFamily]) {
      body.style.fontFamily = FONT_MAP[config.fontFamily];
    }
    body.placeholder = config.placeholder || 'Escribe algo…';
  }

  if (wrap) {
    wrap.style.maxWidth = config.editorWidth === 'none' ? '' : config.editorWidth;
  }

  // Sincronizar el límite de notas en caché con el módulo de notas
  setNotesLimit(config.maxNotes || 10);

  // Sincronizar el guardado automático de archivos físicos
  setAutoSave(!!config.autoSave);
}

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
    autoSave:    currentConfig.autoSave
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
