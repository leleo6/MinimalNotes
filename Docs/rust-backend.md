# Backend Rust

## Estructura

```
src-tauri/
├── Cargo.toml              # Dependencias Rust y perfil de release
├── Cargo.lock              # Lockfile de Rust
├── build.rs                # Script de build de Tauri
├── tauri.conf.json         # Configuración de la app Tauri
├── capabilities/
│   └── default.json        # Permisos de seguridad Tauri v2
├── icons/                  # Íconos de la aplicación
├── gen/schemas/            # Schemas JSON auto-generados
└── src/
    ├── main.rs             # Punto de entrada, plugins, handlers
    ├── commands.rs         # Comandos IPC
    └── file_manager.rs     # I/O de archivos
```

---

## `main.rs` — Punto de Entrada

**Ruta:** `src-tauri/src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

En release, oculta la consola de Windows para que la app funcione como aplicación de escritorio estándar.

### Funciones principales:

| Función | Descripción |
|---------|-------------|
| `main()` | Registra plugins, configura manejador de evento de cierre, y ejecuta la app |

**Plugins registrados:**
- `tauri_plugin_store` — Persistencia JSON
- `tauri_plugin_dialog` — Diálogos nativos OS

**Eventos manejados:**
- `on_window_event`: Cuando la ventana principal se cierra (`CloseRequested`), también cierra la ventana de configuración si está abierta, buscándola por su label `settings`.

**Comandos registrados:**
- `open_file`
- `save_file_as`
- `save_file`

---

## `commands.rs` — Comandos IPC

**Ruta:** `src-tauri/src/commands.rs`

Comandos invocables desde el frontend via `window.__TAURI__.core.invoke()`.

### `open_file`

```rust
#[tauri::command]
async fn open_file(app: AppHandle) -> Result<(String, String), String>
```

**Flujo:**
1. Abre diálogo nativo "Abrir archivo" con filtros para múltiples extensiones
2. Si el usuario selecciona un archivo, lee el contenido con `file_manager::read_file()`
3. Retorna `(path, content)` al frontend

**Filtros de archivo:**
```
Archivos de texto: .txt, .md
Código fuente: .py, .rs, .html, .css, .js, .ts, .json, .toml, .c, .cpp, .java, .sh, .yaml, .xml, .csv
Otros: .env, .log, .cfg, .ini, .conf
```

### `save_file_as`

```rust
#[tauri::command]
async fn save_file_as(app: AppHandle, content: String) -> Result<String, String>
```

**Flujo:**
1. Abre diálogo nativo "Guardar como" con filtros de archivo
2. Si el usuario elige una ruta, escribe el contenido con `file_manager::write_file()`
3. Retorna la ruta seleccionada

### `save_file`

```rust
#[tauri::command]
async fn save_file(path: String, content: String) -> Result<(), String>
```

**Flujo:**
1. Recibe una ruta conocida y contenido
2. Escribe directamente sin diálogo
3. Usado para "Guardar" en archivos ya abiertos/guardados previamente

---

## `file_manager.rs` — I/O de Archivos

**Ruta:** `src-tauri/src/file_manager.rs`

Funciones puras de lectura/escritura sin estado.

### `read_file`

```rust
pub fn read_file(path: &str) -> Result<String, String>
```

- Abre el archivo en la ruta especificada
- Lee todo el contenido como UTF-8
- Retorna error human-readable si el archivo no existe o no puede leerse

### `write_file`

```rust
pub fn write_file(path: &str, content: &str) -> Result<(), String>
```

- Crea los directorios padre si no existen (`create_dir_all`)
- Escribe el contenido al archivo
- Retorna error human-readable si falla la escritura

---

## `tauri.conf.json` — Configuración Tauri

**Ruta:** `src-tauri/tauri.conf.json`

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| `productName` | `minimalnotes` | Nombre del producto |
| `version` | `0.1.0` | Versión actual |
| `identifier` | `com.minimalnotes.app` | Identificador único |
| `build.frontendDist` | `../src` | Directorio frontend (HTML directo, sin bundler) |
| `build.devUrl` | — | No usado (sin dev server) |
| `build.beforeDevCommand` | — | Sin comando previo |
| `build.beforeBuildCommand` | — | Sin comando previo |
| `app.windows[0].title` | `MinimalNotes` | Título de ventana |
| `app.windows[0].width` | `1100` | Ancho inicial |
| `app.windows[0].height` | `720` | Alto inicial |
| `app.windows[0].minWidth` | `320` | Ancho mínimo |
| `app.windows[0].minHeight` | `240` | Alto mínimo |
| `app.windows[0].center` | `true` | Centrar al abrir |
| `app.windows[0].backgroundColor` | `#F6F5F0` | Color de fondo (evita flash blanco) |
| `app.security.csp` | `null` | CSP deshabilitado |
| `app.withGlobalTauri` | `true` | Expone `window.__TAURI__` |
| `bundle.targets` | `"all"` | Genera todos los formatos |

---

## `Cargo.toml` — Dependencias Rust

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-store = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Perfil de Release (Optimizado para tamaño)

```toml
[profile.release]
panic = "abort"          # Sin unwinding (binario más pequeño)
codegen-units = 1        # Máxima optimización
lto = true               # Link-time optimization
opt-level = "s"          # Optimizar por tamaño
strip = true             # Stripear símbolos de debug
```

---

## Permisos (Capabilities)

**Ruta:** `src-tauri/capabilities/default.json`

```json
{
  "identifier": "default",
  "windows": ["main", "settings", "mn-note-*"],
  "permissions": [
    "core:default",
    "store:default",
    "dialog:default",
    "core:window:default",
    "core:window:allow-create",
    "core:window:allow-close",
    "core:window:allow-set-size",
    "core:window:allow-set-position",
    "core:window:allow-set-title",
    "core:window:allow-center",
    "core:webview:allow-set-background-color",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit"
  ]
}
```

Los permisos permiten:
- Creación y gestión de múltiples ventanas
- Cambio de tamaño y posición de ventanas
- Emisión y escucha de eventos cross-window
- Acceso a store y diálogos nativos
