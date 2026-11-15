@echo off
title Knowrizon AI - Backend Server
cd /d "%~dp0backend"
echo ===================================================
echo Starting Knowrizon AI Backend (Flask + SocketIO)...
echo Local Port: http://127.0.0.1:5000
echo.
echo Ready Accounts:
echo   [Admin]   admin@knowrizon.ai / AdminPassword123!
echo   [Student] student@example.com / student123
echo ===================================================
python run.py
if errorlevel 1 (
    echo.
    echo Backend encountered an issue. If python is not recognized or dependencies are missing, try:
    echo cd backend ^&^& pip install -r requirements.txt
    echo.
)
pause
