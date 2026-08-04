# Biblioteca Personal

Biblioteca Personal es una aplicación web moderna para gestionar libros y cómics, escanear ISBN con la cámara del dispositivo, buscar información automáticamente en Open Library y mantener los datos sincronizados opcionalmente con Firebase Firestore.

## Características

- Gestión local en el navegador con almacenamiento persistente.
- Escáner de ISBN compatible con cámara en Chrome, Edge y Safari.
- Búsqueda automática de metadatos desde Open Library.
- Soporte para libros y cómics con la misma lógica de escaneo.
- Búsqueda por título, autor, editorial e ISBN.
- Exportación e importación de copias de seguridad en JSON.
- Preparada para desplegar en Vercel o GitHub Pages.

## Requisitos

- Un navegador moderno con acceso a cámara.
- Opcional: una cuenta de Firebase para sincronización en la nube.

## Instalación local

1. Abre la carpeta del proyecto.
2. Sirve los archivos con un servidor estático simple:
   - Python: `python3 -m http.server 8000`
   - Node: `npx serve .`
3. Abre la URL mostrada en tu navegador.

## Configuración de Firebase (opcional)

1. Crea un proyecto en Firebase.
2. Activa Firestore Database.
3. En la app web, copia los valores de configuración en el panel lateral de la aplicación.
4. Guarda la configuración y usa el botón de sincronización.

> El proyecto no requiere un backend propio porque la aplicación usa Firebase directamente desde el navegador. Las claves públicas de Firebase se exponen de forma estándar.

## Despliegue

### Vercel

1. Sube la carpeta a GitHub.
2. Conecta el repositorio en Vercel.
3. Usa el comando de despliegue por defecto.

### GitHub Pages

1. Activa GitHub Pages desde la configuración del repositorio.
2. Elige la rama principal y la carpeta raíz.
3. La app se publica automáticamente con los archivos estáticos del proyecto.

## Estructura del proyecto

- `index.html`: estructura principal de la interfaz.
- `styles.css`: estilos responsivos para PC, Android e iPhone.
- `app.js`: lógica de la colección, escáner, Open Library, Firebase y JSON.
- `tests/app.test.js`: pruebas básicas de lógica.

## Mantenimiento

- Mantén el archivo JSON de backup actualizado antes de cambiar de dispositivo.
- Revisa periódicamente la configuración de Firebase y los permisos de Firestore.
- Si cambias la estructura de datos, adapta la importación y sincronización para conservar compatibilidad.

## Pruebas

Ejecuta:

```bash
npm test
```
