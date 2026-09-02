@echo off
setlocal
cd /d "%~dp0"
title Shiny Doodle Network Swiss Knife 2.0

echo [!] Launching Shiny Doodle Network Swiss Knife...

:: Check python command
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python start.py
    goto end
)

:: Check py launcher
where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    py start.py
    goto end
)

:: Check python3
where python3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python3 start.py
    goto end
)

echo.
echo [X] Error: Python 3 was not found in your system PATH.
echo Please install Python 3 from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation.
echo.
pause

:end
endlocal
