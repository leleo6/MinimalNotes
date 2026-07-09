/**
 * config.js — Configuración centralizada de la aplicación.
 *
 * Principio SRP: única responsabilidad = definir y aplicar la
 * configuración global (temas, tipografía, editor).
 *
 * Principio DRY: define los valores por defecto UNA SOLA VEZ;
 * main.js y settings.js los importan desde aquí.
 */

import { setNotesLimit, setAutoSave } from './notes.js';
import { setWindowBackgroundColor } from './ipc.js';

const DEFAULT_SHORTCUTS = {
  newNote:      { modifiers: { ctrl: true,  alt: false, shift: false }, key: 'n'       },
  openFile:     { modifiers: { ctrl: true,  alt: false, shift: false }, key: 'o'       },
  saveNote:     { modifiers: { ctrl: true,  alt: false, shift: false }, key: 's'       },
  undo:         { modifiers: { ctrl: true,  alt: false, shift: false }, key: 'z'       },
  redo:         { modifiers: { ctrl: true,  alt: false, shift: false }, key: 'y'       },
  zoomIn:       { modifiers: { ctrl: true,  alt: false, shift: false }, key: ['=', '+'] },
  zoomOut:      { modifiers: { ctrl: true,  alt: false, shift: false }, key: '-'       },
  resetZoom:    { modifiers: { ctrl: true,  alt: false, shift: false }, key: '0'       },
  toggleSearch: { modifiers: { ctrl: true,  alt: false, shift: false }, key: 'h'       },
};

export const CONFIG_DEFAULTS = {
  fontSize:    16,
  lineHeight:  1.8,
  fontFamily:  'system',
  theme:       'light',
  editorWidth: 'none',
  placeholder: 'Escribe algo…',
  maxNotes:    10,
  autoSave:    false,
  showTabbar:  false,
  shortcuts:   { ...DEFAULT_SHORTCUTS },
};

/** Devuelve una copia profunda de los atajos por defecto. */
export function getDefaultShortcuts() {
  return Object.fromEntries(
    Object.entries(DEFAULT_SHORTCUTS).map(([k, v]) => [
      k,
      { modifiers: { ...v.modifiers }, key: Array.isArray(v.key) ? [...v.key] : v.key },
    ])
  );
}

export const FONT_MAP = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  serif:  "'Lora', Georgia, serif",
  mono:   "'JetBrains Mono', monospace",
};

export const THEME_BG = {
  light: '#F6F5F0',
  dark:  '#181816',
  sepia: '#F1E7D0',
};

/**
 * Aplica la configuración al DOM en caliente.
 * @param {object} config
 */
export function applyConfigToDOM(config) {
  const theme = config.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mn-theme', theme);

  setWindowBackgroundColor(THEME_BG[theme] || THEME_BG.light);

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

  setNotesLimit(config.maxNotes || 10);
  setAutoSave(!!config.autoSave);

  const tabbarEl = document.getElementById('tabbar');
  if (tabbarEl) {
    tabbarEl.classList.toggle('hidden', !config.showTabbar);
  }
}
