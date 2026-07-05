const emit = window.__TAURI__.event.emit;

import { CONFIG_DEFAULTS, getDefaultShortcuts } from './config.js';
import { createStepper } from './stepper.js';
import { saveSettingsToStore } from './store.js';

// B3 fix: deep clone defaults to avoid mutating the shared module-level object
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

let config = deepClone(CONFIG_DEFAULTS);

async function loadConfig() {
  try {
    const params = new URLSearchParams(window.location.search);
    const shortcutsRaw = params.get('shortcuts');
    let shortcuts = null;
    if (shortcutsRaw) {
      try { shortcuts = JSON.parse(shortcutsRaw); } catch (_) {}
    }
    config = {
      fontSize:    parseInt(params.get('fontSize')) || CONFIG_DEFAULTS.fontSize,
      lineHeight:  parseFloat(params.get('lineHeight')) || CONFIG_DEFAULTS.lineHeight,
      fontFamily:  params.get('fontFamily') || CONFIG_DEFAULTS.fontFamily,
      theme:       params.get('theme') || CONFIG_DEFAULTS.theme,
      editorWidth: params.get('editorWidth') || CONFIG_DEFAULTS.editorWidth,
      placeholder: params.get('placeholder') || CONFIG_DEFAULTS.placeholder,
      maxNotes:    parseInt(params.get('maxNotes')) || CONFIG_DEFAULTS.maxNotes,
      autoSave:    params.get('autoSave') === 'true',
      showTabbar:  params.get('showTabbar') === 'true',
      shortcuts:   shortcuts || getDefaultShortcuts(),
    };
  } catch (err) {
    console.warn('[settings] load params error:', err);
  }
  renderControls();
  applyLocalTheme();
}

function formatShortcut(sc) {
  const parts = [];
  if (sc.modifiers.ctrl)  parts.push('Ctrl');
  if (sc.modifiers.alt)   parts.push('Alt');
  if (sc.modifiers.shift) parts.push('Shift');
  const k = Array.isArray(sc.key) ? sc.key[0] : sc.key;
  if (k === ' ') parts.push('Space');
  else parts.push(k.toUpperCase());
  return parts.join('+');
}

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

// B7 fix: save to store directly from settings window (defense-in-depth)
async function triggerLiveUpdate() {
  await emit('settings-changed', config);
  await saveSettingsToStore(config).catch(() => {});
}

loadConfig();
setupShortcutRecorders();

createStepper({
  decId: 'fontSizeDec', incId: 'fontSizeInc', valId: 'fontSizeVal',
  initial: config.fontSize, min: 10, max: 32,
  onChange: (v) => { config.fontSize = v; return triggerLiveUpdate(); },
});
createStepper({
  decId: 'lineHeightDec', incId: 'lineHeightInc', valId: 'lineHeightVal',
  initial: config.lineHeight, min: 1.0, max: 3.0, step: 0.1,
  parser: parseFloat, format: (v) => v.toFixed(1),
  onChange: (v) => { config.lineHeight = v; return triggerLiveUpdate(); },
});
createStepper({
  decId: 'maxNotesDec', incId: 'maxNotesInc', valId: 'maxNotesVal',
  initial: config.maxNotes, min: 2, max: 50,
  onChange: (v) => { config.maxNotes = v; return triggerLiveUpdate(); },
});

document.getElementById('fontFamilySelect').addEventListener('change', async () => {
  config.fontFamily = document.getElementById('fontFamilySelect').value;
  await triggerLiveUpdate();
});
document.getElementById('themeSelect').addEventListener('change', async () => {
  config.theme = document.getElementById('themeSelect').value;
  applyLocalTheme();
  await triggerLiveUpdate();
});
document.getElementById('editorWidthSelect').addEventListener('change', async () => {
  config.editorWidth = document.getElementById('editorWidthSelect').value;
  await triggerLiveUpdate();
});
document.getElementById('placeholderInput').addEventListener('input', async () => {
  config.placeholder = document.getElementById('placeholderInput').value;
  await triggerLiveUpdate();
});
document.getElementById('autoSaveToggle').addEventListener('change', async () => {
  config.autoSave = document.getElementById('autoSaveToggle').checked;
  await triggerLiveUpdate();
});
document.getElementById('showTabbarToggle').addEventListener('change', async () => {
  config.showTabbar = document.getElementById('showTabbarToggle').checked;
  await triggerLiveUpdate();
});

document.getElementById('btnApply').addEventListener('click', async () => {
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().close();
  } catch (err) {
    console.error('[settings] error al cerrar ventana:', err);
  }
});

document.getElementById('btnReset').addEventListener('click', async () => {
  config = { ...CONFIG_DEFAULTS, shortcuts: getDefaultShortcuts() };
  renderControls();
  applyLocalTheme();
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
    try {
      const { getCurrentWindow } = window.__TAURI__.window;
      await getCurrentWindow().close();
    } catch (err) {
      console.error('[settings] error al cerrar por Escape:', err);
    }
  }
});
