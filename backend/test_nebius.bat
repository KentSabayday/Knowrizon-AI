@echo off
title Nebius AI Token Factory Diagnostic Tool
cd /d "%~dp0"
echo ========================================================
echo   Testing Nebius Token Factory Connection...
echo ========================================================
python test_nebius.py
echo.
pause

