# DanielaKPOP · Juego 3D + laboratorio Blender automático

Juego gratuito con Babylon.js, TypeScript y GitHub Pages.

- Juego: https://antleorom-dev.github.io/DanielaKPOP/
- Laboratorio 3D: https://antleorom-dev.github.io/DanielaKPOP/preview.html
- Editor de muebles: https://antleorom-dev.github.io/DanielaKPOP/?editor=1

## Personaje generado en la nube

Este repositorio incorpora un pipeline de **Blender headless + Python + GitHub Actions**. No requiere instalar Blender en el PC, no usa servicios de IA de pago y no necesita iniciar sesión en Mixamo.

**Archivos:**
- scripts/character/generate_daniela.py: crea automáticamente el modelo chibi original, sus materiales, un esqueleto de nueve huesos y 16 clips.
- scripts/character/validate_glb.py: verifica que el GLB tenga geometría, esqueleto y todos los clips requeridos.
- .github/workflows/character.yml: genera y valida el personaje al cambiar los scripts, o al ejecutarlo manualmente mediante Run workflow; publica GLB, Blend y JSON como artifact.
- .github/workflows/pages.yml: en cada push a main instala Blender y NumPy, regenera el personaje, lo valida y publica el juego más la página de laboratorio.
- src/character-preview.ts + preview.html: visor Babylon.js aislado de las mecánicas del juego estable.

## Flujo de trabajo

1. Haz cambios en el repositorio.
2. GitHub Actions descarga las dependencias libres de Blender desde Ubuntu.
3. Blender crea los modelos 3D y anima huesos (no genera vídeos).
4. Se exporta un único GLB autónomo con 16 animaciones.
5. Un validador exige una malla, piel enlazada al armature, huesos y 16 animaciones.
6. El build Vite crea index.html y preview.html para GitHub Pages.
7. Si falla cualquier paso, no se publica la versión rota.

El GLB publicado se genera durante el build: no se necesita introducir su contenido binario en el repositorio. El proyecto Blender editable se guarda además como artifact descargable (14 días).

## Animaciones

Idle, Wave, Giggle, Laugh, DancePop, DanceCute, DanceHipHop, DanceDisco, Sing, Eat, Drink, Volley, Sleep, Bath, Jump, Celebrate.

Son **animaciones procedurales de primera generación**: no equivalen todavía a motion capture profesional. Se pueden mejorar por scripts o importar animaciones FBX descargadas legalmente y retargetearlas al rig en el futuro.

## Conservar el juego estable

La Daniela actual sigue siendo la protagonista de index.html. El nuevo personaje riggeado está en preview.html para comprobar estética, iluminación, orientación y movimientos. No lo sustituiremos hasta verificar cómo funciona en móvil y adaptar las mecánicas de cuidado a su nueva malla.

## Costes y licencias

Blender y las librerías 3D utilizadas son gratuitas. GitHub Actions usa runners estándar de un repositorio público y GitHub Pages publica el juego sin servicios adicionales de pago. El personaje experimental es geometría nueva creada por nuestro script. Los assets descargados de Kenney y Quaternius tienen sus licencias de origen.

Los planes y límites de los servicios externos pueden cambiar.
