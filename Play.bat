@echo off
rem One-click launcher: always runs the current code in this folder.
rem Installs or refreshes dependencies when package.json / package-lock.json changed,
rem starts the dev server (live reload while the code is edited) and opens the game in the browser.
rem Close this window to stop the server.
title Heroes Sandbox
cd /d "%~dp0"
echo.
echo   HEROES SANDBOX  -  retro-futuristic UI  -  7 maps, 6 modes
rem Read the roster straight out of src/heroes/index.js so this banner never goes stale
powershell -NoProfile -Command "$s=Get-Content src\heroes\index.js -Raw; $m=[regex]::Match($s,'export const CHARS=\[(.*?)\];'); if($m.Success){ $ids=$m.Groups[1].Value -split ','; Write-Host ('  ' + $ids.Count + ' heroes loaded, newest ' + $ids[-1].Trim()) } else { Write-Host '  (hero roster not found)' }"
echo   Newest hero: Kang the Conqueror - chrono bolts, time stop, rewinds, shields and temporal clones
echo.
set NEED=0
if not exist node_modules\.package-lock.json set NEED=1
if %NEED%==0 (
  powershell -NoProfile -Command "if ((Get-Item package-lock.json).LastWriteTime -gt (Get-Item node_modules\.package-lock.json).LastWriteTime -or (Get-Item package.json).LastWriteTime -gt (Get-Item node_modules\.package-lock.json).LastWriteTime) { exit 1 } else { exit 0 }"
  if errorlevel 1 set NEED=1
)
if %NEED%==1 (
  echo Installing dependencies...
  call npm.cmd install
)
rem --force re-bundles dependencies so an old cached build is never served
call npm.cmd run dev -- --open --force
