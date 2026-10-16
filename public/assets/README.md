# DanielaKPOP assets

Este directorio debe contener los recursos originales facilitados por el propietario.

## Cómo incorporar los archivos aportados

1. Descarga el archivo **`DanielaKPOP-recursos-v0.4.zip`** preparado en ChatGPT.
2. **Sin descomprimirlo**, abre la raíz de este repositorio y elige **Add file → Upload files**.
3. Arrastra el ZIP tal cual, con ese nombre exacto, y confirma el commit en `main`.
4. GitHub Actions lo descomprime automáticamente durante la compilación y publica la canción y todos los modelos en GitHub Pages.

También funciona subir los archivos ya descomprimidos directamente en `public/assets/`, pero el ZIP es mucho más sencillo.

Archivos utilizados directamente:
- `public/assets/studio-song.mp3` — canción completa, activable solo en el estudio.
- `public/assets/food/strawberry.glb`, `soda-can.glb`, `cupcake.glb` — alimentación 3D.
- `public/assets/interior/*.glb` — muebles de habitación, cocina y baño.
- `public/assets/vfx/*.png` — partículas y efectos complementarios.

Si algún archivo no está disponible, el juego utiliza sus figuras procedurales en lugar de bloquearse. La minicadena avisa si falta el MP3.

### Licencias
- Kenney Food Kit: CC0.
- Kenney Particle Pack: CC0.
- Quaternius Ultimate House Interior: el paquete entregado se describe como CC0; conservar la documentación de origen.

La cuenta indicada para Mixamo no supone que las animaciones ya estén descargadas: deberán importarse como archivos FBX/GLB compatibles si se desea sustituir las animaciones procedurales.
