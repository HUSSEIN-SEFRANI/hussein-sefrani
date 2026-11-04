@echo off
chcp 65001 >nul
title TV Manager
cd /d "%~dp0"
echo Starting TV Manager... keep this window open.
py tv_manager.py --show
if errorlevel 1 python tv_manager.py --show
pause
