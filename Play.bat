@echo off
rem One-click launcher: installs dependencies the first time, starts the dev server
rem (live reload while the code is edited) and opens the game in the browser.
rem Close this window to stop the server.
title Heroes Sandbox
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm.cmd install
)
call npm.cmd run dev -- --open
