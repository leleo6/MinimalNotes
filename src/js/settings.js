/**
 * settings.js — Lógica de la ventana independiente de configuración.
 *
 * FIX: usa @tauri-apps/plugin-store directamente (igual que store.js)
 *      en lugar de invocar el IPC crudo con rid:0 (poco fiable).
 * FIX: cierra la ventana con getCurrentWindow().close() en vez de
 *      window.close(), que en Tauri deja la ventana en negro.
 */

const emit = window.__TAURI__.event.emit;

import { CONFIG_DEFAULTS } from './config.js';
import { createStepper } from './stepper.js';

/* ---------- Estado local ---------- */
let config = { ...CONFIG_DEFAULTS };

/* ---------- Cargar config desde URL ---------- */
async function loadConfig() {
  try {
    const params = new URLSearchParams(window.location.search);
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
    };
  } catch (err) {
    console.warn('[settings] load params error:', err);
  }
  renderControls();
  applyLocalTheme();
}

/* ---------- Reflejar estado en UI ---------- */
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
}

/* ---------- Aplicar tema a esta misma ventana ---------- */
function applyLocalTheme() {
  const theme = config.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  // Persistir en localStorage para que la próxima apertura aplique el
  // tema sincrónicamente antes del primer pintado (evita el flash blanco).
  localStorage.setItem('mn-theme', theme);
}

/* ---------- Emitir cambios en tiempo real ---------- */
async function triggerLiveUpdate() {
  await emit('settings-changed', config);
}

/* ---------- Init (DEBE ir antes de createStepper para initial correcto) ---------- */
loadConfig();

/* ---------- Steppers (DRY: factory createStepper) ---------- */
createStepper({
  decId: 'fontSizeDec', incId: 'fontSizeInc', valId: 'fontSizeVal',
  initial: config.fontSize, min: 10, max: 32,
  onChange: (v) => { config.fontSize = v; triggerLiveUpdate(); },
});
createStepper({
  decId: 'lineHeightDec', incId: 'lineHeightInc', valId: 'lineHeightVal',
  initial: config.lineHeight, min: 1.0, max: 3.0, step: 0.1,
  parser: parseFloat, format: (v) => v.toFixed(1),
  onChange: (v) => { config.lineHeight = v; triggerLiveUpdate(); },
});
createStepper({
  decId: 'maxNotesDec', incId: 'maxNotesInc', valId: 'maxNotesVal',
  initial: config.maxNotes, min: 2, max: 50,
  onChange: (v) => { config.maxNotes = v; triggerLiveUpdate(); },
});

/* ---------- Selects ---------- */
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

/* ---------- Input: Placeholder ---------- */
document.getElementById('placeholderInput').addEventListener('input', async () => {
  config.placeholder = document.getElementById('placeholderInput').value;
  await triggerLiveUpdate();
});

/* ---------- Input: AutoSave Checkbox ---------- */
document.getElementById('autoSaveToggle').addEventListener('change', async () => {
  config.autoSave = document.getElementById('autoSaveToggle').checked;
  await triggerLiveUpdate();
});

/* ---------- Input: Show Tabbar Checkbox ---------- */
document.getElementById('showTabbarToggle').addEventListener('change', async () => {
  config.showTabbar = document.getElementById('showTabbarToggle').checked;
  await triggerLiveUpdate();
});

/* ---------- Botón "Listo" — cierra la ventana correctamente ---------- */
document.getElementById('btnApply').addEventListener('click', async () => {
  try {
    // FIX: window.close() deja la ventana en negro en Tauri.
    // Usar el API nativo de Tauri para cerrar la ventana correctamente.
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().close();
  } catch (err) {
    console.error('[settings] error al cerrar ventana:', err);
  }
});

/* ---------- Botón "Restaurar" ---------- */
document.getElementById('btnReset').addEventListener('click', async () => {
  config = { ...CONFIG_DEFAULTS };
  renderControls();
  applyLocalTheme();
  await triggerLiveUpdate();
  showToast('Configuración restaurada');
});

/* ---------- Toast ---------- */
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

/* ---------- Cerrar con tecla ESC ---------- */
document.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape') {
    try {
      const { getCurrentWindow } = window.__TAURI__.window;
      await getCurrentWindow().close();
    } catch (err) {
      console.error('[settings] error al cerrar por Escape:', err);
    }
  }
});
