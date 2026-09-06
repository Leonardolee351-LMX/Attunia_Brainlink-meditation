# Attunia auto-deploy + start (PowerShell)
# Right-click -> Run with PowerShell, or:
#   powershell -ExecutionPolicy Bypass -File .\start.ps1

$ErrorActionPreference = "Continue"
Set-Location -LiteralPath $PSScriptRoot

function Add-PathIfExists([string]$dir) {
  if ($dir -and (Test-Path $dir)) {
    $env:Path = "$dir;$env:Path"
  }
}

function Ensure-Path {
  Write-Host "[0/5] Prepare PATH ..."
  Add-PathIfExists "D:\node.js"
  Add-PathIfExists "$env:ProgramFiles\nodejs"
  Add-PathIfExists "${env:ProgramFiles(x86)}\nodejs"
  Add-PathIfExists "$env:LOCALAPPDATA\Programs\nodejs"
  Add-PathIfExists "$env:LOCALAPPDATA\Programs\Python\Python312"
  Add-PathIfExists "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts"
  Add-PathIfExists "$env:LOCALAPPDATA\Programs\Python\Python311"
  Add-PathIfExists "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts"
}

function Ensure-Node {
  Write-Host "[1/5] Ensure Node.js runtime ..."
  try {
    $null = Get-Command node -ErrorAction Stop
    $null = Get-Command npm -ErrorAction Stop
    Write-Host "      found node $(node -v) / npm $(npm -v)"
    return
  } catch {}

  Write-Host "      Node missing. Trying winget install OpenJS.NodeJS.LTS ..."
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] No Node and no winget. Install https://nodejs.org/ then retry."
    Read-Host "Press Enter to exit"
    exit 1
  }
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  Add-PathIfExists "$env:ProgramFiles\nodejs"
  Add-PathIfExists "$env:LOCALAPPDATA\Programs\nodejs"
  try {
    Write-Host "      node $(node -v) / npm $(npm -v)"
  } catch {
    Write-Host "[ERROR] Node still not on PATH. Re-open Explorer and run again."
    Read-Host "Press Enter to exit"
    exit 1
  }
}

function Ensure-NpmDeps {
  Write-Host "[2/5] Deploy npm product dependencies ..."
  if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] package.json missing."
    Read-Host "Press Enter to exit"
    exit 1
  }
  if (-not (Test-Path "node_modules\vite\package.json")) {
    Write-Host "      npm install ..."
    npm install
  } else {
    Write-Host "      refreshing deps ..."
    npm install --no-fund --no-audit
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed."
    Read-Host "Press Enter to exit"
    exit 1
  }
  Write-Host "      npm dependencies OK."
}

function Ensure-LocalConfig {
  Write-Host "[3/5] Seed local runtime config ..."
  if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") { Copy-Item ".env.example" ".env" -Force }
    else { New-Item ".env" -ItemType File | Out-Null }
    Write-Host "      created .env"
  }
  New-Item -ItemType Directory -Force -Path "config" | Out-Null
  if (-not (Test-Path "config\llm-apis.local.md") -and (Test-Path "config\llm-apis.md")) {
    Copy-Item "config\llm-apis.md" "config\llm-apis.local.md" -Force
    Write-Host "      created config\llm-apis.local.md (edit for your keys)"
  }
  if (-not (Test-Path "config\media-apis.local.md") -and (Test-Path "config\media-apis.md")) {
    Copy-Item "config\media-apis.md" "config\media-apis.local.md" -Force
    Write-Host "      created config\media-apis.local.md"
  }
  Write-Host "      local config OK."
}

function Ensure-PythonBridge {
  Write-Host "[4/5] Optional BrainLink serial-bridge runtime ..."
  $bridge = Join-Path (Split-Path $PSScriptRoot -Parent) "collector\serial_bridge.py"
  if (-not (Test-Path $bridge)) {
    Write-Host "      serial_bridge.py not found (demo / Web Serial still OK)"
    return
  }
  $py = $null
  if (Get-Command python -ErrorAction SilentlyContinue) { $py = "python" }
  elseif (Get-Command py -ErrorAction SilentlyContinue) { $py = "py" }
  if (-not $py) {
    Write-Host "      Python not found; skip pyserial."
    return
  }
  & $py -c "import serial" 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "      installing pyserial ..."
    & $py -m pip install --user pyserial
  } else {
    Write-Host "      pyserial OK."
  }
  Write-Host "      bridge script: $bridge"
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Attunia  auto-deploy + start"
Write-Host "========================================"
Write-Host "  folder: $PWD"
Write-Host ""

Ensure-Path
Ensure-Node
Ensure-NpmDeps
Ensure-LocalConfig
Ensure-PythonBridge

Write-Host ""
Write-Host "[5/5] Start product  http://localhost:3000"
Write-Host "      Close this window to stop the server."
Write-Host ""

Start-Process "http://localhost:3000/" -ErrorAction SilentlyContinue
npm run dev
Write-Host ""
Write-Host "Server stopped (exit $LASTEXITCODE)."
Read-Host "Press Enter to exit"
