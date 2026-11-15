@echo off
title Knowrizon AI - Local Launcher
echo ===================================================
echo   Launching Knowrizon AI Ecosystem Locally
echo ===================================================
echo 1. Launching Backend on http://127.0.0.1:5000 ...
start "Knowrizon Backend" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
echo 2. Launching Frontend on http://localhost:5173 ...
start "Knowrizon Frontend" cmd /k "%~dp0run_frontend.bat"
echo.
echo ===================================================
echo Both servers have been launched in separate windows!
echo Ready Accounts:
echo   [Admin]   admin@knowrizon.ai / AdminPassword123!
echo   [Student] student@example.com / student123
echo Open your browser at: http://localhost:5173
echo ===================================================
timeout /t 5 >nul
