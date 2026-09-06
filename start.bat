@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM Double-click: keep window open (no flash-close)
if /I "%~1"=="__INNER__" goto MAIN
cmd /k "%~f0" __INNER__
exit /b 0

:MAIN
title Attunia deploy and start
color 0A
chcp 65001 >nul 2>&1

echo.
echo ========================================
echo   Attunia  auto-deploy + start
echo ========================================
echo   folder: %CD%
echo.

REM ---------- [0/5] PATH ----------
echo [0/5] Prepare PATH for Node / Python ...
if exist "D:\node.js\node.exe" set "PATH=D:\node.js;%PATH%"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
if exist "%LocalAppData%\Microsoft\WindowsApps" set "PATH=%LocalAppData%\Microsoft\WindowsApps;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
if exist "C:\Python312\python.exe" set "PATH=C:\Python312;C:\Python312\Scripts;%PATH%"
if exist "C:\Python311\python.exe" set "PATH=C:\Python311;C:\Python311\Scripts;%PATH%"

REM ---------- [1/5] Node ----------
echo [1/5] Ensure Node.js runtime ...
where node >nul 2>&1
if errorlevel 1 (
  echo       Node not found. Trying winget install OpenJS.NodeJS.LTS ...
  where winget >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] No Node.js and no winget.
    echo         Install LTS: https://nodejs.org/
    goto END
  )
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
  if exist "%LocalAppData%\Programs\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
  where node >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Node installed but not on PATH. Re-open Explorer and run again.
    goto END
  )
)

for /f "delims=" %%i in ('where node 2^>nul') do (
  echo       found: %%i
  goto NODE_FOUND
)
:NODE_FOUND
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd missing. Reinstall Node.js LTS.
  goto END
)
node -v
call npm.cmd -v
echo       Node runtime OK.
echo.

REM ---------- [2/5] npm deps ----------
echo [2/5] Deploy npm product dependencies ...
if not exist "package.json" (
  echo [ERROR] package.json missing. Run from Attunia repo root.
  goto END
)
if not exist "node_modules\vite\package.json" (
  echo       Running npm install ...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    goto END
  )
) else (
  echo       Refreshing deps ...
  call npm.cmd install --no-fund --no-audit
  if errorlevel 1 (
    echo [WARN] retry npm install ...
    call npm.cmd install
    if errorlevel 1 (
      echo [ERROR] dependency deploy failed.
      goto END
    )
  )
)
echo       npm dependencies OK.
echo.

REM ---------- [3/5] local config ----------
echo [3/5] Seed local runtime config ...
if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo       created .env from .env.example
  ) else (
    type nul > ".env"
    echo       created empty .env
  )
) else (
  echo       .env already exists
)

if not exist "config" mkdir "config" >nul 2>&1

if not exist "config\llm-apis.local.md" (
  if exist "config\llm-apis.md" (
    copy /Y "config\llm-apis.md" "config\llm-apis.local.md" >nul
    echo       created config\llm-apis.local.md
    echo       Edit that file to set your own API keys.
  ) else (
    echo [WARN] config\llm-apis.md missing
  )
) else (
  echo       config\llm-apis.local.md already exists
)

if not exist "config\media-apis.local.md" (
  if exist "config\media-apis.md" (
    copy /Y "config\media-apis.md" "config\media-apis.local.md" >nul
    echo       created config\media-apis.local.md
  )
) else (
  echo       config\media-apis.local.md already exists
)
echo       local config OK.
echo.

REM ---------- [4/5] optional BrainLink bridge ----------
echo [4/5] Optional BrainLink Lite serial-bridge runtime ...
set "BRIDGE=%~dp0..\collector\serial_bridge.py"
if not exist "%BRIDGE%" (
  echo       serial_bridge.py not found.
  echo       App can still run with demo signal / Web Serial.
) else (
  set "PY="
  where python >nul 2>&1
  if not errorlevel 1 set "PY=python"
  if not defined PY (
    where py >nul 2>&1
    if not errorlevel 1 set "PY=py"
  )
  if not defined PY (
    echo       Python not found. Skipping pyserial.
  ) else (
    echo       checking pyserial ...
    %PY% -c "import serial" >nul 2>&1
    if errorlevel 1 (
      echo       installing pyserial ...
      %PY% -m pip install --user pyserial
      if errorlevel 1 (
        echo [WARN] pip install pyserial failed. Demo mode still works.
      ) else (
        echo       pyserial OK.
      )
    ) else (
      echo       pyserial already installed.
    )
  )
  echo       bridge script: %BRIDGE%
)
echo.

REM ---------- [5/5] start ----------
echo ========================================
echo   [5/5] Start product  http://localhost:3000
echo   Close this window to stop the server.
echo ========================================
echo.

start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000/"

call npm.cmd run dev
set "ERR=%ERRORLEVEL%"
echo.
if not "%ERR%"=="0" (
  echo [ERROR] npm run dev exited with code %ERR%
) else (
  echo Server stopped.
)

:END
echo.
echo Press any key to close...
pause >nul
endlocal
exit /b 0
