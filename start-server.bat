@echo off
echo Starting WispherGrid Local Server...
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python server...
    python server.py
    goto :end
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js server...
    node server.js
    goto :end
)

echo ERROR: Neither Python nor Node.js found!
echo.
echo Please install one of the following:
echo   1. Python 3: https://www.python.org/downloads/
echo   2. Node.js: https://nodejs.org/
echo.
echo Or use any other HTTP server to serve the files.
pause
:end

