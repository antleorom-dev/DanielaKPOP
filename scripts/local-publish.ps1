param(
  [switch]$SkipPull
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Dist = Join-Path $Root 'dist'
$DeployTemp = Join-Path ([System.IO.Path]::GetTempPath()) 'kpop-idol-gh-pages-deploy'
$SiteUrl = 'https://antleorom-dev.github.io/DanielaKPOP/'
$PagesSettingsUrl = 'https://github.com/antleorom-dev/DanielaKPOP/settings/pages'

function Write-Step([string]$Text) {
  Write-Host ''
  Write-Host ('=== ' + $Text + ' ===') -ForegroundColor Cyan
}

function Invoke-Native([string]$Label, [scriptblock]$Command) {
  Write-Step $Label
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label fallo con codigo $LASTEXITCODE."
  }
}

Write-Host 'K-POP IDOL - build y publicacion local' -ForegroundColor Magenta
Write-Host 'El build se ejecuta en este PC. GitHub Actions no compila el juego.'

foreach ($command in @('git', 'node', 'npm')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Falta '$command' en el PC. Instala Git/Node.js y vuelve a ejecutar este archivo."
  }
}

Push-Location $Root
try {
  $trackedChanges = (& git status --porcelain --untracked-files=no) -join [Environment]::NewLine
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo leer el estado de Git.'
  }
  if ($trackedChanges.Trim()) {
    throw "Hay cambios locales sin guardar en archivos versionados. Haz commit/stash antes de publicar para no perder nada."
  }

  if (-not $SkipPull) {
    Invoke-Native 'Descargando cambios de GitHub' { git fetch origin main }
    Invoke-Native 'Cambiando a main' { git switch main }
    Invoke-Native 'Actualizando main sin merges automaticos' { git pull --ff-only origin main }
  }

  $sourceSha = (& git rev-parse --short HEAD).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo obtener el commit actual.'
  }

  $remote = (& git remote get-url origin).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $remote) {
    throw 'No se pudo obtener el remote origin.'
  }

  $existingGhPages = (& git ls-remote --heads origin gh-pages) -join ''
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo comprobar la rama gh-pages.'
  }
  $firstGhPagesDeploy = -not [bool]$existingGhPages

  Write-Step 'Preparando recursos del juego'
  $resourceZip = Join-Path $Root 'public\assets\DanielaKPOP-recursos-v0.4.zip'
  if (Test-Path $resourceZip) {
    Expand-Archive -Path $resourceZip -DestinationPath $Root -Force
  }

  $requiredAssets = @(
    'public\assets\studio-song.mp3',
    'public\assets\Shakira_Burna_Boy_-_Dai_Dai.mp3',
    'public\assets\interior\Bed_King.glb'
  )
  foreach ($relativePath in $requiredAssets) {
    $fullPath = Join-Path $Root $relativePath
    if (-not (Test-Path $fullPath)) {
      throw "Falta un recurso obligatorio: $relativePath"
    }
  }

  Invoke-Native 'Instalando/actualizando dependencias' { npm install --no-audit --no-fund }
  Invoke-Native 'Validando TypeScript y creando dist para GitHub Pages' { npm run build:pages }

  if (-not (Test-Path (Join-Path $Dist 'index.html'))) {
    throw 'El build termino sin generar dist\index.html.'
  }

  Write-Step 'Conservando los modelos Blender experimentales'
  $characterDir = Join-Path $Dist 'assets\characters'
  New-Item -ItemType Directory -Force -Path $characterDir | Out-Null
  $characterFiles = @(
    'daniela-rigged.glb',
    'daniela-manifest.json',
    'daniela-original-inspired.glb',
    'daniela-original-inspired-manifest.json'
  )
  foreach ($file in $characterFiles) {
    $destination = Join-Path $characterDir $file
    if (-not (Test-Path $destination)) {
      $uri = $SiteUrl + 'assets/characters/' + $file
      try {
        Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $destination -TimeoutSec 90
        Write-Host "Conservado: $file"
      }
      catch {
        Write-Warning "No se pudo recuperar $file del sitio actual. El juego procedural seguira funcionando; solo puede faltar el laboratorio Blender."
        if (Test-Path $destination) {
          Remove-Item -Force $destination
        }
      }
    }
  }

  New-Item -ItemType File -Force -Path (Join-Path $Dist '.nojekyll') | Out-Null

  Write-Step 'Publicando dist en gh-pages'
  if (Test-Path $DeployTemp) {
    Remove-Item -Recurse -Force $DeployTemp
  }
  New-Item -ItemType Directory -Force -Path $DeployTemp | Out-Null
  Copy-Item -Path (Join-Path $Dist '*') -Destination $DeployTemp -Recurse -Force
  Copy-Item -Path (Join-Path $Dist '.nojekyll') -Destination $DeployTemp -Force

  Push-Location $DeployTemp
  try {
    Invoke-Native 'Creando commit de despliegue' { git init }
    Invoke-Native 'Creando rama gh-pages' { git checkout -b gh-pages }

    $gitName = [string]((& git -C $Root config user.name) -join '')
    $gitEmail = [string]((& git -C $Root config user.email) -join '')
    if ([string]::IsNullOrWhiteSpace($gitName)) { $gitName = 'K-POP IDOL Local Deploy' }
    if ([string]::IsNullOrWhiteSpace($gitEmail)) { $gitEmail = 'local-deploy@users.noreply.github.com' }

    git config user.name $gitName.Trim()
    git config user.email $gitEmail.Trim()
    git add -A
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron preparar los archivos de gh-pages.' }

    git commit -m "deploy: K-POP IDOL desde $sourceSha"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el commit de despliegue.' }

    git remote add origin $remote
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar origin en el despliegue temporal.' }

    Invoke-Native 'Subiendo web terminada a GitHub' { git push --force origin gh-pages }
  }
  finally {
    Pop-Location
  }

  Write-Host ''
  Write-Host 'PUBLICACION LOCAL COMPLETADA.' -ForegroundColor Green
  Write-Host "Commit fuente: $sourceSha"
  Write-Host "Web: $SiteUrl"
  Write-Host ''
  Write-Host 'A partir de ahora el build pesado lo hace tu PC, no GitHub Actions.' -ForegroundColor Green

  if ($firstGhPagesDeploy) {
    Write-Host ''
    Write-Host 'SOLO ESTA PRIMERA VEZ:' -ForegroundColor Yellow
    Write-Host '1. En GitHub Pages cambia Source a: Deploy from a branch.'
    Write-Host '2. Branch: gh-pages.'
    Write-Host '3. Folder: /(root).'
    Write-Host '4. Pulsa Save.'
    Write-Host 'Se abrira la pantalla correcta de GitHub.'
    Start-Process $PagesSettingsUrl
  }
  else {
    Start-Process $SiteUrl
  }
}
finally {
  Pop-Location
  if (Test-Path $DeployTemp) {
    Remove-Item -Recurse -Force $DeployTemp -ErrorAction SilentlyContinue
  }
}
