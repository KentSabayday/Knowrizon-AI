@echo off
title Nebius AI Diagnostic Test
cd /d "%~dp0backend"
echo ===================================================
echo Testing Nebius Token Factory Connection...
echo ===================================================
python test_nebius.py
echo.
pause

