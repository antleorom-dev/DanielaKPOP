# DanielaKPOP assets

Este directorio debe contener los recursos originales facilitados por el propietario.

## Cómo incorporar los archivos aportados

1. Descarga y descomprime `DanielaKPOP-recursos-v0.4.zip` generado en ChatGPT.
2. Conserva la estructura `public/assets/...` del ZIP.
3. Sube los archivos al mismo lugar de este repositorio mediante **Add file → Upload files**. En GitHub no basta con subir el ZIP: hay que subir los archivos descomprimidos.
4. Cada push a `main` publica automáticamente los recursos en GitHub Pages.

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
