# Guía de Usuario de MinimalNotes

## Primeros Pasos

Al abrir MinimalNotes por primera vez, verás una ventana limpia con un área de escritura vacía y un punto en la barra lateral izquierda.

### Crear una nota nueva
- **Atajo:** `Ctrl + N`
- **Botón:** Haz clic en el icono `+` en el menú de acciones del editor
- Se creará una nueva nota en blanco y aparecerá como un nuevo punto en la barra lateral

### Escribir
Simplemente comienza a escribir en el área de texto. El editor es un textarea plano sin formato enriquecido.

### Guardar en el sistema de archivos
- **Atajo:** `Ctrl + S`
  - Si la nota es nueva: abre el diálogo "Guardar como"
  - Si ya tiene una ruta asociada: guarda directamente
- **Botón:** Icono de disco en el menú de acciones

### Abrir un archivo existente
- **Atajo:** `Ctrl + O`
- **Botón:** Icono de carpeta en el menú de acciones

---

## Interfaz de Usuario

```
┌──────────────────────────────────────────────────────┐
│ [•] [•] [•]  │  Nota sobre...  │  ✕                  │  ← Tabbar
│ ─────────────┼───────────────────────────────────────┤
│  Spine       │                                       │
│  Sidebar     │  ┌─────────────────────────────────┐  │
│              │  │                                 │  │
│  [•] ← activa│  │   Área de escritura (textarea)  │  │
│  [•]         │  │                                 │  │
│  [•]         │  │                                 │  │
│              │  └─────────────────────────────────┘  │
│              │                                       │
│              │  ┌─────────────────────────────────┐  │
│              │  │ [+][abrir][guardar][eliminar]   │  │  ← Action Menu
│              │  ├─────────────────────────────────┤  │
│              │  │ Palabras: 142  │  100%  │ 💾 ⚙️ │  │  ← Footer
│              │  └─────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────┘
```

### Spine Sidebar (Barra Lateral)
- Columna delgada a la izquierda con puntos indicadores
- Cada punto representa una nota
- El punto activo está resaltado
- Haz clic en un punto para activar esa nota
- Arrastra un punto fuera de la ventana para abrirlo en ventana independiente
- Se oculta automáticamente cuando hay solo una nota

### Tabbar (Barra de Pestañas)
- Muestra pestañas con el excerpt de cada nota
- Haz clic en una pestaña para activarla
- Haz clic en `✕` para cerrar la pestaña
- Doble clic en una pestaña para abrirla en ventana independiente
- Arrastra una pestaña fuera de la ventana para abrirla en ventana independiente
- Se puede ocultar desde Configuración

### Editor Pane
- Área de escritura principal
- Contiene el textarea con zoom ajustable
- Debajo del textarea: menú de acciones, contador de palabras, indicador de zoom, indicador de guardado, botón de configuración

### Action Menu
| Icono | Acción | Atajo |
|-------|--------|-------|
| `+` | Nueva nota | `Ctrl + N` |
| `📂` | Abrir archivo | `Ctrl + O` |
| `💾` | Guardar | `Ctrl + S` |
| `🗑️` | Eliminar nota | — |

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + N` | Crear nueva nota |
| `Ctrl + O` | Abrir archivo del sistema |
| `Ctrl + S` | Guardar nota |
| `Ctrl + Z` | Deshacer |
| `Ctrl + Shift + Z` | Rehacer |
| `Ctrl + H` | Buscar y reemplazar |
| `Escape` | Cerrar ventana de configuración |

Los atajos de teclado se pueden personalizar desde la ventana de Configuración.

---

## Temas

MinimalNotes incluye 3 temas de escritura premium:

### ☀️ Modo Claro
Fondo: papel suave (`#F6F5F0`) con tinta oscura. Ideal para uso diurno.

### 🌙 Modo Oscuro
Tonos tierra cálidos y profundos. Descanso visual absoluto para sesiones nocturnas.

### 🍂 Modo Sepia
Apariencia de papel antiguo. Ideal para lecturas prolongadas.

Para cambiar de tema:
1. Abre Configuración (icono ⚙️ en el footer)
2. Selecciona el tema deseado en la sección "Theme & Appearance"
3. Haz clic en "Apply"

---

## Configuración

La ventana de configuración se abre desde el icono ⚙️ en el footer del editor.

### Secciones:

**Theme & Appearance**
- Tema (Light / Dark / Sepia)
- Color de acento

**Typography**
- Tamaño de fuente (12-32px)
- Interlineado (1.0-3.0)
- Familia tipográfica (System / Serif / Mono)

**Editor**
- Ancho máximo del editor
- Placeholder personalizado
- Auto-guardado al escribir (on/off)
- Mostrar barra de pestañas (on/off)
- Mostrar scrollbar (auto/always/hidden)
- Límite de notas en caché (5-50)

**Keyboard Shortcuts**
- Configuración interactiva de atajos
- Haz clic en un atajo, luego presiona la combinación deseada
- Botón "Reset" para restaurar valores por defecto

---

## Gestión de Notas

### Notas en caché vs. Archivos del sistema

- **Notas en caché**: Se guardan automáticamente en el store interno de la app. No se pierden al cerrar la aplicación, pero no son archivos individuales en tu sistema.
- **Archivos del sistema**: Notas abiertas o guardadas en tu disco duro como archivos `.txt`, `.md`, etc.

### Límite de notas en caché
Por defecto, la app mantiene hasta 10 notas sin guardar en disco. Al superar este límite, se elimina automáticamente la nota no guardada más antigua. Puedes ajustar este límite en Configuración (hasta 50).

### Abrir nota en ventana independiente
- Arrastra un punto del sidebar o una pestaña fuera de la ventana
- Haz doble clic en una pestaña
- Cada ventana independiente tiene su propio editor y se sincroniza en tiempo real con las demás ventanas

### Eliminar nota
1. Activa la nota que deseas eliminar
2. Haz clic en el icono 🗑️ del menú de acciones
3. La nota se eliminará del caché local (no afecta archivos del sistema)

---

## Multi-ventana

MinimalNotes soporta múltiples ventanas independientes:

- Cada nota puede abrirse en su propia ventana
- Las ventanas se sincronizan en tiempo real
- El estado de cada ventana (posición, tamaño, zoom) se persiste al cerrar y se restaura al abrir
- Las ventanas se etiquetan como `mn-note-` + ID de nota

**Casos de uso:**
- Comparar dos notas lado a lado
- Tener una nota de referencia mientras se escribe en otra
- Usar múltiples monitores

---

## Buscar y Reemplazar

1. Presiona `Ctrl + H` para abrir el panel de búsqueda
2. Escribe el término a buscar (búsqueda case-insensitive)
3. Enter para ir al siguiente resultado
4. Shift + Enter para ir al anterior
5. Usa "Replace" para reemplazar uno o "Replace All" para reemplazar todos

---

## Solución de Problemas

### La app no inicia
Verifica que tu sistema cumpla con los requisitos de Tauri v2:
- Linux: `webkit2gtk-4.1`, `libgtk-3-dev`, etc.
- Windows: WebView2 Runtime (viene con Windows 11)
- macOS: Sin requisitos adicionales

### Una nota no se guarda
- Revisa que tengas permisos de escritura en la carpeta destino
- El auto-guardado solo funciona si la nota ya tiene una ruta asociada (guardada al menos una vez)

### Las ventanas no se sincronizan
- Asegúrate de que todas las ventanas pertenezcan a la misma instancia de la aplicación
- Cierra y vuelve a abrir la aplicación si el problema persiste
