# Stack Técnico: Bloc de Notas Ultra-Ligero, Rápido y Minimalista

Este documento define la arquitectura y las tecnologías seleccionadas para el desarrollo de un editor de texto y código minimalista de escritorio. El objetivo principal es lograr un rendimiento instantáneo (similar al Bloc de Notas de Windows), un consumo de memoria RAM mínimo y la capacidad de gestionar archivos reales (`.md`, `.html`, `.css`, `.py`, `.txt`).

---

## 1. Resumen de Tecnologías (The Stack)

| Capa | Tecnología | Razón de la elección |
| :--- | :--- | :--- |
| **Contenedor Desktop** | **Tauri (v2)** | Alternativa ligera a Electron. Núcleo en Rust. Aplicación final de ~10MB y uso mínimo de RAM (~30MB). |
| **Interfaz (Frontend)**| **HTML5 Nativo** | Estructura limpia sin sobrecarga de árboles de componentes complejos. |
| **Estilos (CSS)** | **CSS3 Puro** | Diseño minimalista, variables de entorno para temas (claro/oscuro) y tipografías del sistema (cero fuentes externas). |
| **Lógica Frontend** | **Vanilla JavaScript (ES6+)** | Máxima velocidad de ejecución. Sin frameworks (React/Vue) para evitar el costo de procesamiento del Virtual DOM. |
| **Core (Backend)** | **Rust** | Máximo rendimiento, seguridad de memoria y acceso nativo ultra-rápido al sistema de archivos del Sistema Operativo. |

---

## 2. Arquitectura del Proyecto

La aplicación utiliza una **Arquitectura Multi-proceso basada en IPC (Inter-Process Communication)**. El frontend y el backend están completamente aislados por razones de seguridad y rendimiento.

```text
  [ INTERFAZ (WebView2) ]               [ CORE (Rust) ]
  ┌──────────────────────┐             ┌─────────────────────┐
  │  HTML5 / CSS3 / JS   │  ◄──IPC──►  │   File Manager      │ ──► [ Disco Duro ]
  │  (Estado y Eventos)  │             │   (Comandos Tauri)  │     (.py, .md, .html)
  └──────────────────────┘             └─────────────────────┘

notes/
├── src-tauri/               <-- BACKEND (Rust)
│   ├── src/
│   │   └── main.rs          
│   └── tauri.conf.json      
└── src/                     
    ├── css/
    │   
    ├── js/
    │   
    └── index.html           