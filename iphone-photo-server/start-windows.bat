@echo off
chcp 65001 >nul
title iPhone Photo Server
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo [!] Python is not installed. Download it from https://www.python.org/downloads/
  echo     and tick "Add Python to PATH" during setup.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo First run: installing requirements...
  python -m venv .venv || (pause & exit /b 1)
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt || (pause & exit /b 1)
)

".venv\Scripts\python.exe" server.py %*
pause
