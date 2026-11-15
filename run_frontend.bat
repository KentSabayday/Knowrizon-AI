@echo off
title Knowrizon AI - Frontend Server
cd /d "%~dp0frontend"
echo ===================================================
echo Starting Knowrizon AI Frontend (Vite React)...
echo Local URL: http://localhost:5173
echo ===================================================
call npm run dev
if errorlevel 1 (
    echo.
    echo Frontend encountered an issue. If node/npm is not recognized or packages are missing, try:
    echo cd frontend ^&^& npm install
    echo.
)
pause

