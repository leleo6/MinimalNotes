// file_manager.rs — I/O puro de archivos.
//
// Principio SRP: única responsabilidad = leer y escribir
// contenido de archivos del sistema. No conoce el contexto
// de Tauri ni los comandos IPC.
//
// Principio DRY: la lógica de apertura/escritura vive aquí
// y solo aquí; commands.rs la invoca sin duplicarla.

use std::fs;
use std::path::Path;

/// Lee el contenido de un archivo de texto.
///
/// # Errors
/// Devuelve un mensaje de error legible si la lectura falla.
pub fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Error al leer '{}': {}", path, e))
}

/// Escribe `content` en `path`, creando directorios intermedios si no existen.
///
/// # Errors
/// Devuelve un mensaje de error legible si la escritura falla.
pub fn write_file(path: &str, content: &str) -> Result<(), String> {
    if let Some(parent) = Path::new(path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Error al crear directorios para '{}': {}", path, e))?;
    }
    fs::write(path, content).map_err(|e| format!("Error al escribir '{}': {}", path, e))
}
