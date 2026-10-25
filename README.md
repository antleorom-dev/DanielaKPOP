# K-POP IDOL · Juego 3D

Juego 3D gratuito construido con Babylon.js, TypeScript y Vite.

- Juego: https://antleorom-dev.github.io/DanielaKPOP/
- Laboratorio 3D: https://antleorom-dev.github.io/DanielaKPOP/preview.html
- Editor: https://antleorom-dev.github.io/DanielaKPOP/?editor=1

## Publicacion local: flujo principal

El flujo normal ya no necesita que GitHub Actions compile el juego.

En Windows, desde una copia local del repositorio, ejecuta:

`PUBLICAR-KPOP-IDOL.bat`

Ese boton hace automaticamente:

1. comprueba que no haya cambios locales versionados sin guardar;
2. descarga el ultimo `main` desde GitHub;
3. extrae el paquete de recursos;
4. ejecuta `npm install`;
5. valida TypeScript;
6. crea el build Vite con base `/DanielaKPOP/`;
7. conserva los GLB experimentales del sitio actual si no estan presentes localmente;
8. añade `.nojekyll`;
9. crea un commit limpio solo con el contenido de `dist`;
10. fuerza la rama de publicacion `gh-pages` a ese build terminado.

Si el build falla, no se sube una version rota.

### Configuracion unica de GitHub Pages

Despues del primer `PUBLICAR-KPOP-IDOL.bat`, configura una sola vez:

- Settings -> Pages
- Source: **Deploy from a branch**
- Branch: **gh-pages**
- Folder: **/(root)**

El propio script abre esa pantalla la primera vez que crea `gh-pages`.

A partir de entonces, cada publicacion normal es simplemente volver a ejecutar `PUBLICAR-KPOP-IDOL.bat`.

GitHub Pages puede mostrar una ejecucion interna de despliegue, pero el trabajo pesado (npm, TypeScript, Vite y recursos) ya se ha hecho en el PC. El branch publicado incluye `.nojekyll` para servir directamente los archivos estaticos ya compilados.

## Comandos utiles

Desarrollo local:

`npm run dev`

Build normal:

`npm run build`

Build exactamente como GitHub Pages:

`npm run build:pages`

Preview local:

`npm run preview`

## GitHub Actions: solo herramientas opcionales

Los workflows del repositorio ya no se disparan automaticamente con cada push o PR.

- `.github/workflows/preview-check.yml`: validacion TypeScript/Vite manual.
- `.github/workflows/character.yml`: generacion Blender manual.
- `.github/workflows/pages.yml`: pipeline antiguo completo, conservado como fallback manual.

Por tanto, quedarse sin minutos/cuota de Actions no impide desarrollar, validar ni crear el build normal del juego.

## Personaje procedural y Blender

La protagonista procedural de `index.html` sigue siendo la version principal y estable.

El personaje Blender riggeado es un experimento A/B separado. Los scripts disponibles son:

- `scripts/character/generate_daniela.py`
- `scripts/character/validate_glb.py`

El pipeline Blender puede generar:

- `daniela-rigged.glb`
- `daniela-original-inspired.glb`
- fuentes `.blend`
- manifests de validacion
- previews

El publicador local normal intenta conservar los GLB ya publicados para que el laboratorio A/B no desaparezca aunque no se regenere Blender en cada build.

## Animaciones Blender

Idle, Wave, Giggle, Laugh, DancePop, DanceCute, DanceHipHop, DanceDisco, Sing, Eat, Drink, Volley, Sleep, Bath, Jump, Celebrate.

Son animaciones procedurales de primera generacion y el personaje Blender sigue siendo opt-in.

## Recursos

El paquete `public/assets/DanielaKPOP-recursos-v0.4.zip` se extrae automaticamente antes del build local.

El publicador comprueba como minimo:

- `public/assets/studio-song.mp3`
- `public/assets/Shakira_Burna_Boy_-_Dai_Dai.mp3`
- `public/assets/interior/Bed_King.glb`

## Regla de seguridad del deploy

`gh-pages` contiene exclusivamente el resultado compilado.

El codigo fuente sigue viviendo en `main`.

No editar `gh-pages` manualmente: cada publicacion local la reemplaza por completo con un nuevo `dist`.
