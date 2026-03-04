@echo off
title Sea Route Calculator

echo.
echo  ==========================================
echo    Sea Route Calculator
echo  ==========================================
echo.

echo  [1/2] Checking dependencies...
pip install flask searoute -q 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  ERROR: pip install failed. Make sure Python is installed.
    pause
    exit /b 1
)

echo  [2/2] Starting server...
echo.
echo  App will open at: http://localhost:5050
echo  Press CTRL+C to stop.
echo.

REM Open Chrome after a short delay (background)
start /b cmd /c "ping -n 3 127.0.0.1 >nul && start chrome http://localhost:5050"

REM Start Flask (foreground — keeps window alive)
python app.py

pause
