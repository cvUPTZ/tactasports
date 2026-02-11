@echo off
REM Start Python API Server for Soccer Analysis

echo ========================================
echo   Soccer Analysis API Server
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

echo [1/3] Checking Python environment...
python --version

REM Check if virtual environment exists
if not exist "venv\" (
    echo.
    echo [2/3] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
) else (
    echo [2/3] Virtual environment already exists
)

REM Activate virtual environment
echo.
echo [3/3] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo.
echo Installing/Updating dependencies...
pip install -r python\requirements.txt

REM Start API server
echo.
echo ========================================
echo   Starting API Server
echo ========================================
echo.
echo Server will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

cd python
python api_server.py

pause
