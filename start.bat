@echo off
title Supply Chain Commander - Game Launcher

echo ==============================================================
echo           Supply Chain Commander - Game Launcher
echo ==============================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    echo Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Show Node.js version
echo [INFO] Node.js version:
node --version
echo.

:: Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not available. Please check your Node.js installation.
    echo.
    pause
    exit /b 1
)

:: Check if dependencies need to be installed
if not exist "node_modules" (
    echo [INSTALL] First run, installing dependencies...
    echo This may take a few minutes, please wait...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies. Please check your network connection.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed!
    echo.
) else (
    echo [INFO] Dependencies already installed, skipping...
    echo.
)

:: Start development server
echo [START] Starting the game...
echo.
echo ==============================================================
echo   The game will open in your browser.
echo   If it doesn't open automatically, visit: http://localhost:5173
echo   Press Ctrl+C to stop the server.
echo ==============================================================
echo.
echo [Server Log]
echo.

:: Start and open browser
call npm run dev -- --host
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server failed to start. Error code: %ERRORLEVEL%
    echo.
)

echo.
echo Press any key to close this window...
pause > nul