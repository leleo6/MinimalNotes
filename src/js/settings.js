/**
 * settings.js — Lógica de la ventana independiente de configuración.
 *
 * FIX: usa @tauri-apps/plugin-store directamente (igual que store.js)
 *      en lugar de invocar el IPC crudo con rid:0 (poco fiable).
 * FIX: cierra la ventana con getCurrentWindow().close() en vez de
 *      window.close(), que en Tauri deja la ventana en negro.
 */

const emit = window.__TAURI__.event.emit;

/* ---------- Valores por defecto (deben coincidir con CONFIG_DEFAULTS en main.js) ---------- */
const DEFAULTS = {
  fontSize:    16,
  lineHeight:  1.8,
  fontFamily:  'system',
  theme:       'light',
  editorWidth: 'none',
  placeholder: 'Escribe algo…',
  maxNotes:    10,
  autoSave:    false,
};

/* ---------- Estado local ---------- */
let config = { ...DEFAULTS };

/* ---------- Cargar config desde URL ---------- */
async function loadConfig() {
  try {
    const params = new URLSearchParams(window.location.search);
    config = {
      fontSize:    parseInt(params.get('fontSize')) || DEFAULTS.fontSize,
      lineHeight:  parseFloat(params.get('lineHeight')) || DEFAULTS.lineHeight,
      fontFamily:  params.get('fontFamily') || DEFAULTS.fontFamily,
      theme:       params.get('theme') || DEFAULTS.theme,
      editorWidth: params.get('editorWidth') || DEFAULTS.editorWidth,
      placeholder: params.get('placeholder') || DEFAULTS.placeholder,
      maxNotes:    parseInt(params.get('maxNotes')) || DEFAULTS.maxNotes,
      autoSave:    params.get('autoSave') === 'true',
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

/* ---------- Steppers: Tamaño de letra ---------- */
document.getElementById('fontSizeDec').addEventListener('click', async () => {
  config.fontSize = Math.max(10, config.fontSize - 1);
  document.getElementById('fontSizeVal').textContent = config.fontSize;
  await triggerLiveUpdate();
});
document.getElementById('fontSizeInc').addEventListener('click', async () => {
  config.fontSize = Math.min(32, config.fontSize + 1);
  document.getElementById('fontSizeVal').textContent = config.fontSize;
  await triggerLiveUpdate();
});

/* ---------- Steppers: Altura de línea ---------- */
document.getElementById('lineHeightDec').addEventListener('click', async () => {
  config.lineHeight = Math.max(1.0, parseFloat((config.lineHeight - 0.1).toFixed(1)));
  document.getElementById('lineHeightVal').textContent = config.lineHeight.toFixed(1);
  await triggerLiveUpdate();
});
document.getElementById('lineHeightInc').addEventListener('click', async () => {
  config.lineHeight = Math.min(3.0, parseFloat((config.lineHeight + 0.1).toFixed(1)));
  document.getElementById('lineHeightVal').textContent = config.lineHeight.toFixed(1);
  await triggerLiveUpdate();
});

/* ---------- Steppers: Límite de notas ---------- */
document.getElementById('maxNotesDec').addEventListener('click', async () => {
  config.maxNotes = Math.max(2, config.maxNotes - 1);
  document.getElementById('maxNotesVal').textContent = config.maxNotes;
  await triggerLiveUpdate();
});
document.getElementById('maxNotesInc').addEventListener('click', async () => {
  config.maxNotes = Math.min(50, config.maxNotes + 1);
  document.getElementById('maxNotesVal').textContent = config.maxNotes;
  await triggerLiveUpdate();
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
  config = { ...DEFAULTS };
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

/* ---------- Init ---------- */
loadConfig();

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
