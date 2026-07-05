// main.rs — Punto de entrada del proceso Rust (Core).
//
// Principio SRP: única responsabilidad = arrancar el ciclo de
// vida de Tauri, registrar plugins y comandos IPC.
// La lógica de negocio vive en commands.rs y file_manager.rs.

// Evitar ventana de consola en Windows en release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod file_manager;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        // Plugin de almacenamiento key-value resiliente a crashes
        .plugin(tauri_plugin_store::Builder::default().build())
        // Plugin de diálogos nativos del SO
        .plugin(tauri_plugin_dialog::init())
        // Al cerrar la ventana principal, cerrar también la de configuración si está abierta
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    if let Some(settings_win) = window.get_webview_window("settings") {
                        let _ = settings_win.close();
                    }
                }
            }
        })
        // Registro de comandos IPC expuestos al frontend
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::save_file_as,
            commands::save_file,
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar MinimalNotes");
}
