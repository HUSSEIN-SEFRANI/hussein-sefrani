@echo off
chcp 65001 >nul
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TV-Manager.bat"
(
  echo @echo off
  echo chcp 65001 ^>nul
  echo cd /d "%~dp0"
  echo start "TV Manager" /min py tv_manager.py --show --no-browser
) > "%LINK%"
echo.
echo Done: TV Manager will start by itself every time Windows starts.
echo To undo, delete: %LINK%
echo.
pause
