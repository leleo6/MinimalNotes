#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod file_manager;

use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, serde::Serialize)]
struct FilePayload {
    path: String,
    content: String,
    is_new: bool,
}

struct StartupPayload(Mutex<Option<FilePayload>>);

/// Helper DRY para obtener estampas de tiempo en nanosegundos (DRY).
fn get_timestamp_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0))
        .as_nanos()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Traer todas las ventanas activas al frente
            for window in app.webview_windows().values() {
                let _ = window.set_focus();
            }

            let paths: Vec<String> = args.into_iter().skip(1).collect();
            if paths.is_empty() {
                // Abrir una nueva ventana independiente vacía
                let ts = get_timestamp_nanos();
                let label = format!("cli_empty_{}", ts);
                let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::default())
                    .title("MinimalNotes")
                    .inner_size(1100.0, 720.0)
                    .min_inner_size(320.0, 240.0)
                    .resizable(true)
                    .decorations(true)
                    .center()
                    .build();
            } else {
                let mut win_counter = 0u64;
                for path_str in paths {
                    win_counter += 1;
                    let absolute_path = Path::new(&_cwd).join(&path_str);
                    let absolute_path_str = absolute_path.to_string_lossy().to_string();
                    let (content, is_new) = match fs::read_to_string(&absolute_path) {
                        Ok(c) => (c, false),
                        Err(_) => (String::new(), true),
                    };
                    let payload = FilePayload { path: absolute_path_str.clone(), content, is_new };
                    let ts = get_timestamp_nanos();
                    let label = format!("cli_{}_{}", ts, win_counter);
                    let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::default())
                        .title(format!("MinimalNotes — {}", absolute_path_str))
                        .inner_size(1100.0, 720.0)
                        .min_inner_size(320.0, 240.0)
                        .resizable(true)
                        .decorations(true)
                        .center()
                        .initialization_script(&format!(
                            "window.__CLI_DATA__ = {};",
                            serde_json::to_string(&payload).unwrap()
                        ))
                        .build();
                }
            }
        }))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    if let Some(s) = window.get_webview_window("settings") {
                        let _ = s.close();
                    }
                }
            }
        })
        .setup(|app| -> Result<(), Box<dyn std::error::Error>> {
            let args: Vec<String> = std::env::args().skip(1).collect();
            let current_dir = std::env::current_dir().unwrap_or_default();
            
            let main_payload = if !args.is_empty() {
                // FIX: Canonicalizar ruta relativa de cold start uniéndola con el directorio de ejecución actual.
                let first_path = current_dir.join(&args[0]);
                let first = first_path.to_string_lossy().to_string();
                let (content, is_new) = match fs::read_to_string(&first_path) {
                    Ok(c) => (c, false),
                    Err(_) => (String::new(), true),
                };
                
                for (j, path_str) in args.iter().skip(1).enumerate() {
                    let p_path = current_dir.join(path_str);
                    let p_str = p_path.to_string_lossy().to_string();
                    let (c, n) = match fs::read_to_string(&p_path) {
                        Ok(content) => (content, false),
                        Err(_) => (String::new(), true),
                    };
                    let p = FilePayload { path: p_str.clone(), content: c, is_new: n };
                    let ts = get_timestamp_nanos();
                    let label = format!("cli_{}_{}", ts, j);
                    WebviewWindowBuilder::new(app.handle(), &label, WebviewUrl::default())
                        .title(format!("MinimalNotes — {}", p_str))
                        .initialization_script(&format!(
                            "window.__CLI_DATA__ = {};",
                            serde_json::to_string(&p).unwrap()
                        ))
                        .build()?;
                }
                Some(FilePayload { path: first, content, is_new })
            } else {
                None
            };
            app.manage(StartupPayload(Mutex::new(main_payload)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::save_file_as,
            commands::save_file,
            commands::get_startup_file,
            commands::read_file,
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar MinimalNotes");
}
