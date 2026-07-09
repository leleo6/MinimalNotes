/**
 * ipc.js — Adaptador de comunicación con Tauri (Dependency Inversion).
 * Centraliza la API de Tauri para facilitar pruebas y desacoplar el código.
 */

const hasTauri = typeof window !== 'undefined' && !!window.__TAURI__;

/**
 * Verifica si las APIs de Tauri están disponibles.
 * @returns {boolean}
 */
export function isTauriAvailable() {
  return hasTauri;
}

/**
 * Invoca un comando IPC en el backend.
 * @param {string} cmd 
 * @param {object} args 
 * @returns {Promise<any>}
 */
export async function invoke(cmd, args = {}) {
  if (!hasTauri) {
    console.warn(`[IPC Mock] invoke called: ${cmd}`, args);
    if (cmd === 'read_file') return 'Contenido de prueba';
    if (cmd === 'open_file') return ['/mock/path.txt', 'Contenido de prueba'];
    if (cmd === 'save_file_as') return '/mock/path.txt';
    return null;
  }
  return window.__TAURI__.core.invoke(cmd, args);
}

/**
 * Emite un evento global a todas las ventanas.
 * @param {string} event 
 * @param {any} payload 
 */
export function emit(event, payload) {
  if (!hasTauri) {
    console.warn(`[IPC Mock] emit: ${event}`, payload);
    return;
  }
  try {
    window.__TAURI__.event.emit(event, payload);
  } catch (err) {
    console.error(`[IPC] emit error for ${event}:`, err);
  }
}

export function listen(event, callback) {
  if (!hasTauri) {
    console.warn(`[IPC Mock] listen for: ${event}`);
    return () => {};
  }
  try {
    const promise = window.__TAURI__.event.listen(event, callback);
    return () => {
      promise.then(unlisten => unlisten()).catch(err => console.error(`[IPC] unlisten error for ${event}:`, err));
    };
  } catch (err) {
    console.error(`[IPC] listen error for ${event}:`, err);
    return () => {};
  }
}

/**
 * Muestra un diálogo de confirmación nativo.
 * @param {string} message 
 * @param {object} options 
 * @returns {Promise<boolean>}
 */
export async function ask(message, options = {}) {
  if (!hasTauri) {
    return window.confirm(message);
  }
  try {
    return await window.__TAURI__.dialog.ask(message, options);
  } catch (err) {
    console.warn('[IPC] tauri ask failed, falling back to confirm:', err);
    return window.confirm(message);
  }
}

/**
 * Muestra un mensaje informativo nativo.
 * @param {string} message 
 * @param {object} options 
 */
export async function showMessage(message, options = {}) {
  if (!hasTauri) {
    window.alert(message);
    return;
  }
  try {
    await window.__TAURI__.dialog.message(message, options);
  } catch (err) {
    console.warn('[IPC] tauri message failed, falling back to alert:', err);
    window.alert(message);
  }
}

/**
 * Obtiene la etiqueta identificadora de la ventana actual.
 * @returns {string}
 */
export function getCurrentWindowLabel() {
  if (!hasTauri) return 'main';
  try {
    return window.__TAURI__.window.getCurrentWindow().label;
  } catch (_) {
    return 'main';
  }
}

/**
 * Pone el foco en una ventana específica por su etiqueta.
 * @param {string} label 
 */
export async function setWindowFocus(label) {
  if (!hasTauri) return;
  try {
    const { WebviewWindow } = window.__TAURI__.webviewWindow;
    const win = WebviewWindow.getByLabel(label);
    if (win) await win.setFocus();
  } catch (err) {
    console.error(`[IPC] setWindowFocus failed for ${label}:`, err);
  }
}

/**
 * Crea una nueva ventana Webview Window.
 * @param {string} label 
 * @param {object} options 
 */
export function createWebviewWindow(label, options = {}) {
  if (!hasTauri) {
    console.warn(`[IPC Mock] createWebviewWindow: ${label}`, options);
    return null;
  }
  try {
    const { WebviewWindow } = window.__TAURI__.webviewWindow;
    return new WebviewWindow(label, options);
  } catch (err) {
    console.error(`[IPC] createWebviewWindow failed for ${label}:`, err);
    return null;
  }
}

/**
 * Cierra la ventana actual.
 */
export async function closeCurrentWindow() {
  if (!hasTauri) {
    window.close();
    return;
  }
  try {
    await window.__TAURI__.window.getCurrentWindow().close();
  } catch (err) {
    console.error('[IPC] closeCurrentWindow failed:', err);
  }
}

/**
 * Cambia el color de fondo de la ventana actual.
 * @param {string} hexColor 
 */
export async function setWindowBackgroundColor(hexColor) {
  if (!hasTauri) return;
  try {
    await window.__TAURI__.window.getCurrentWindow().setBackgroundColor(hexColor);
  } catch (_) {}
}

export function listenToWindow(event, callback) {
  if (!hasTauri) return () => {};
  try {
    const win = window.__TAURI__.window.getCurrentWindow();
    const promise = win.listen(event, callback);
    return () => {
      promise.then(unlisten => unlisten()).catch(err => console.error(`[IPC] unlistenToWindow error for ${event}:`, err));
    };
  } catch (err) {
    console.error(`[IPC] listenToWindow error for ${event}:`, err);
    return () => {};
  }
}

/**
 * Obtiene la posición exterior de la ventana actual.
 * @returns {Promise<{x: number, y: number}>}
 */
export async function getWindowPosition() {
  if (!hasTauri) return { x: 0, y: 0 };
  const win = window.__TAURI__.window.getCurrentWindow();
  return win.outerPosition();
}

/**
 * Obtiene el tamaño exterior de la ventana actual.
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getWindowSize() {
  if (!hasTauri) return { width: 800, height: 600 };
  const win = window.__TAURI__.window.getCurrentWindow();
  return win.outerSize();
}
