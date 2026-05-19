@echo off
cd /d "%~dp0"
echo Building PromptBox...
call npx electron-vite build
if %errorlevel% neq 0 (
  echo Build failed! Press any key to exit.
  pause >nul
  exit /b %errorlevel%
)
echo Starting PromptBox...
node_modules\.bin\electron.cmd .
pause
