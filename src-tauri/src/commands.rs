// commands.rs — IPC bridge: JavaScript ↔ Rust.
//
// Principio SRP: única responsabilidad = exponer comandos
// de Tauri que el frontend puede invocar. Delega la lógica
// de I/O a file_manager.rs.
//
// Principio OCP: agregar un nuevo comando no requiere modificar
// los existentes ni main.rs (solo se registra en invoke_handler).

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::file_manager;
use crate::StartupPayload;

/// Abre un diálogo nativo de "Abrir archivo" y devuelve su contenido.
///
/// # Returns
/// `Ok((path, content))` o `Err(mensaje)` si el usuario cancela o hay error.
#[tauri::command]
pub async fn open_file(app: AppHandle) -> Result<(String, String), String> {
    let path = app
        .dialog()
        .file()
        .add_filter("Texto", &["txt", "md", "py", "rs", "html", "css", "js", "ts", "json", "toml", "c", "cpp", "h", "hpp", "java", "sh", "yml", "yaml", "xml"])
        .blocking_pick_file()
        .ok_or("Operación cancelada")?;

    let path_str = path.as_path()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or("Ruta no válida")?;
    let content  = file_manager::read_file(&path_str)?;
    Ok((path_str, content))
}

/// Abre un diálogo nativo de "Guardar como" y escribe el contenido.
///
/// # Returns
/// `Ok(path)` con la ruta donde se guardó, o `Err(mensaje)`.
#[tauri::command]
pub async fn save_file_as(app: AppHandle, content: String) -> Result<String, String> {
    let path = app
        .dialog()
        .file()
        .add_filter("Texto", &["txt", "md", "py", "rs", "html", "css", "js", "ts", "json", "toml", "c", "cpp", "h", "hpp", "java", "sh", "yml", "yaml", "xml"])
        .set_file_name("nota.txt")
        .blocking_save_file()
        .ok_or("Operación cancelada")?;

    let path_str = path.as_path()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or("Ruta no válida")?;
    file_manager::write_file(&path_str, &content)?;
    Ok(path_str)
}

/// Guarda directamente en una ruta conocida (sin diálogo).
///
/// Usado cuando el archivo ya fue abierto o guardado antes.
#[tauri::command]
pub async fn save_file(path: String, content: String) -> Result<(), String> {
    file_manager::write_file(&path, &content)
}

/// Devuelve el archivo pasado como argumento CLI (si existe).
///
/// Usado en arranque en frío para abrir el primer archivo en la ventana principal.
#[tauri::command]
pub fn get_startup_file(
    state: tauri::State<'_, StartupPayload>,
) -> Option<crate::FilePayload> {
    state.0.lock().unwrap().take()
}
