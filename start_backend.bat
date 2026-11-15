@echo off
title Knowrizon AI - Backend Server
cd /d "%~dp0"
if exist "backend" cd backend

echo ========================================================
echo   Starting Knowrizon AI Backend Server
echo ========================================================
echo.
echo [Step 1] Running Nebius AI API Key Health Test...
python test_nebius.py
echo.
echo ========================================================
echo [Step 2] Launching Flask + SocketIO Server on http://127.0.0.1:5000
echo ========================================================
echo.
python run.py
echo.
pause

