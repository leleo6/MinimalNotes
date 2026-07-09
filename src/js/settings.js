/**
 * settings.js — Lógica y eventos del panel de configuración.
 * 
 * Principio OCP: El registro de controles y vinculaciones DOM es declarativo.
 * Para agregar una opción nueva, se inserta una entrada en CONFIG_FIELDS sin alterar la lógica.
 * Principio DIP: Delega el cerrado de ventana y emisión de eventos de Tauri a ipc.js.
 */

import { CONFIG_DEFAULTS, getDefaultShortcuts } from './config.js';
import { createStepper } from './stepper.js';
import { saveSettingsToStore } from './store.js';
import { emit, closeCurrentWindow, setWindowBackgroundColor } from './ipc.js';

// Clonación profunda defensiva de la configuración por defecto
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

let config = deepClone(CONFIG_DEFAULTS);

/**
 * Carga de forma segura y sanitizada los parámetros de la URL para inicializar controles.
 */
async function loadConfig() {
  try {
    const params = new URLSearchParams(window.location.search);
    const shortcutsRaw = params.get('shortcuts');
    let shortcuts = null;
    if (shortcutsRaw) {
      try { shortcuts = JSON.parse(shortcutsRaw); } catch (_) {}
    }
    
    config = {
      fontSize:    parseInt(params.get('fontSize'), 10) || CONFIG_DEFAULTS.fontSize,
      lineHeight:  parseFloat(params.get('lineHeight')) || CONFIG_DEFAULTS.lineHeight,
      fontFamily:  params.get('fontFamily') || CONFIG_DEFAULTS.fontFamily,
      theme:       params.get('theme') || CONFIG_DEFAULTS.theme,
      editorWidth: params.get('editorWidth') || CONFIG_DEFAULTS.editorWidth,
      placeholder: params.get('placeholder') || CONFIG_DEFAULTS.placeholder,
      maxNotes:    parseInt(params.get('maxNotes'), 10) || CONFIG_DEFAULTS.maxNotes,
      autoSave:    params.has('autoSave') ? params.get('autoSave') === 'true' : CONFIG_DEFAULTS.autoSave,
      showTabbar:  params.has('showTabbar') ? params.get('showTabbar') === 'true' : CONFIG_DEFAULTS.showTabbar,
      shortcuts:   shortcuts || getDefaultShortcuts(),
    };
  } catch (err) {
    console.warn('[settings] load params error:', err);
  }
  renderControls();
  applyLocalTheme();
}

/**
 * Convierte un objeto Shortcut en un texto legible por el usuario.
 */
function formatShortcut(sc) {
  if (!sc || !sc.modifiers) return '—';
  const parts = [];
  if (sc.modifiers.ctrl)  parts.push('Ctrl');
  if (sc.modifiers.alt)   parts.push('Alt');
  if (sc.modifiers.shift) parts.push('Shift');
  
  const k = (Array.isArray(sc.key) ? sc.key[0] : sc.key) || '';
  if (!k) return parts.length ? parts.join('+') : '—';
  
  if (k === ' ') parts.push('Space');
  else parts.push(k.toUpperCase());
  
  return parts.join('+');
}

/**
 * Vuelca el estado de configuración en los controles de UI.
 */
function renderControls() {
  document.getElementById('fontSizeVal').textContent    = config.fontSize;
  document.getElementById('lineHeightVal').textContent  = config.lineHeight.toFixed(1);
  document.getElementById('fontFamilySelect').value     = config.fontFamily;
  document.getElementById('themeSelect').value          = config.theme || 'light';
  document.getElementById('editorWidthSelect').value    = config.editorWidth;
  document.getElementById('placeholderInput').value     = config.placeholder;
  document.getElementById('maxNotesVal').textContent    = config.maxNotes;
  document.getElementById('autoSaveToggle').checked     = !!config.autoSave;
  document.getElementById('showTabbarToggle').checked   = !!config.showTabbar;

  document.querySelectorAll('.shortcut-key').forEach(btn => {
    const action = btn.dataset.action;
    const sc = config.shortcuts?.[action];
    if (sc) btn.textContent = formatShortcut(sc);
  });
}

function applyLocalTheme() {
  const theme = config.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mn-theme', theme);
  
  const THEME_BG = { light: '#F6F5F0', dark: '#181816', sepia: '#F1E7D0' };
  setWindowBackgroundColor(THEME_BG[theme] || THEME_BG.light);
}

let _recordingAction = null;

function setupShortcutRecorders() {
  document.querySelectorAll('.shortcut-key').forEach(btn => {
    btn.addEventListener('click', () => startRecording(btn.dataset.action));
  });

  document.addEventListener('keydown', handleRecordingKeydown);
}

function startRecording(action) {
  if (_recordingAction) {
    const prev = document.querySelector(`.shortcut-key[data-action="${_recordingAction}"]`);
    if (prev) prev.classList.remove('recording');
  }
  _recordingAction = action;
  const btn = document.querySelector(`.shortcut-key[data-action="${action}"]`);
  if (btn) {
    btn.textContent = '…';
    btn.classList.add('recording');
  }
}

function handleRecordingKeydown(e) {
  if (!_recordingAction) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopImmediatePropagation();
    cancelRecording();
    return;
  }

  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  const sc = {
    modifiers: {
      ctrl:  e.ctrlKey || e.metaKey,
      alt:   e.altKey,
      shift: e.shiftKey,
    },
    key: e.key,
  };

  config.shortcuts[_recordingAction] = sc;
  triggerLiveUpdate();

  const btn = document.querySelector(`.shortcut-key[data-action="${_recordingAction}"]`);
  if (btn) {
    btn.textContent = formatShortcut(sc);
    btn.classList.remove('recording');
  }
  _recordingAction = null;
}

function cancelRecording() {
  const btn = _recordingAction && document.querySelector(`.shortcut-key[data-action="${_recordingAction}"]`);
  if (btn) {
    const sc = config.shortcuts[_recordingAction];
    btn.textContent = sc ? formatShortcut(sc) : '—';
    btn.classList.remove('recording');
  }
  _recordingAction = null;
}

async function triggerLiveUpdate() {
  emit('settings-changed', config);
  await saveSettingsToStore(config).catch(() => {});
}

// ─── Vinculación de Controles (Declarativo / OCP) ─────────────────────────────

const CONFIG_FIELDS = [
  { id: 'fontFamilySelect',   key: 'fontFamily',  event: 'change', valProp: 'value' },
  { id: 'themeSelect',        key: 'theme',       event: 'change', valProp: 'value', callback: applyLocalTheme },
  { id: 'editorWidthSelect',  key: 'editorWidth',  event: 'change', valProp: 'value' },
  { id: 'placeholderInput',   key: 'placeholder', event: 'input',  valProp: 'value' },
  { id: 'autoSaveToggle',     key: 'autoSave',    event: 'change', valProp: 'checked' },
  { id: 'showTabbarToggle',   key: 'showTabbar',  event: 'change', valProp: 'checked' }
];

function setupConfigFieldListeners() {
  CONFIG_FIELDS.forEach(({ id, key, event, valProp, callback }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(event, async () => {
      config[key] = el[valProp];
      if (callback) callback();
      await triggerLiveUpdate();
    });
  });
}

// Inicialización de flujos
loadConfig();
setupShortcutRecorders();
setupConfigFieldListeners();

let fontSizeStepper, lineHeightStepper, maxNotesStepper;

// Creación de steppers numéricos
fontSizeStepper = createStepper({
  decId: 'fontSizeDec', incId: 'fontSizeInc', valId: 'fontSizeVal',
  initial: config.fontSize, min: 10, max: 32,
  onChange: (v) => { config.fontSize = v; return triggerLiveUpdate(); },
});
lineHeightStepper = createStepper({
  decId: 'lineHeightDec', incId: 'lineHeightInc', valId: 'lineHeightVal',
  initial: config.lineHeight, min: 1.0, max: 3.0, step: 0.1,
  parser: parseFloat, format: (v) => v.toFixed(1),
  onChange: (v) => { config.lineHeight = v; return triggerLiveUpdate(); },
});
maxNotesStepper = createStepper({
  decId: 'maxNotesDec', incId: 'maxNotesInc', valId: 'maxNotesVal',
  initial: config.maxNotes, min: 2, max: 50,
  onChange: (v) => { config.maxNotes = v; return triggerLiveUpdate(); },
});

// Botones de acción inferiores
document.getElementById('btnApply').addEventListener('click', async () => {
  await closeCurrentWindow();
});

document.getElementById('btnReset').addEventListener('click', async () => {
  config = { ...CONFIG_DEFAULTS, shortcuts: getDefaultShortcuts() };
  renderControls();
  applyLocalTheme();
  
  // FIX: Restablecer los valores internos de los steppers para evitar desincronización
  if (fontSizeStepper) fontSizeStepper.value = config.fontSize;
  if (lineHeightStepper) lineHeightStepper.value = config.lineHeight;
  if (maxNotesStepper) maxNotesStepper.value = config.maxNotes;

  await triggerLiveUpdate();
  showToast('Configuración restaurada');
});

function showToast(msg) {
  let toast = document.getElementById('settingsToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'settingsToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2000);
}

document.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape' && !_recordingAction) {
    await closeCurrentWindow();
  }
});
