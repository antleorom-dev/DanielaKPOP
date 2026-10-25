@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   K-POP IDOL - ACTUALIZAR + BUILD + PUBLICAR
echo ============================================================
echo.
echo Este PC hara el build y subira la web terminada a gh-pages.
echo No necesitamos gastar GitHub Actions para compilar el juego.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-publish.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] La publicacion no ha terminado. Mira el mensaje de arriba.
  echo No se ha sustituido la web por un build roto.
  pause
  exit /b %EXIT_CODE%
)

echo [OK] K-POP IDOL compilado y subido correctamente.
echo.
pause
exit /b 0
