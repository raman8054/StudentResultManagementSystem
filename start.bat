@echo off
title Chandigarh University - Student Result Management System (AIP)
color 0F
cls
echo ==============================================================
echo   CHANDIGARH UNIVERSITY - STUDENT RESULT MANAGEMENT SYSTEM
echo   Advanced Internet Programming (AIP) Mini-Project
echo   Roll Series: 26MCI10158
echo ==============================================================
echo.
echo [1/3] Checking Node.js environment...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org or double click
    echo 'public\standalone.html' to run in standalone client mode.
    pause
    exit /b 1
)

echo [2/3] Initializing SQLite database & REST API server...
cd /d "%~dp0"

echo [3/3] Opening browser at http://localhost:3000 ...
start "" "http://localhost:3000"

echo.
echo ==============================================================
echo [SUCCESS] Server is live! Keep this terminal window open.
echo           To shut down the server, press Ctrl + C.
echo ==============================================================
echo.
node server.js
pause
