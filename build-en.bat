@echo off
echo Building File Push Tool...

REM Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js not installed, please install Node.js 18+
    pause
    exit /b 1
)

REM Check ADB installation
adb version >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: ADB not installed, Android device support will be unavailable
    echo Please install Android SDK Platform Tools
)

REM Check local idb.exe exists
if not exist "idb.exe" (
    echo Warning: Local idb.exe not found, iOS device support will be unavailable
    echo Please place idb.exe in the application root directory
)

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Dependency installation failed
    pause
    exit /b 1
)

REM Build application
echo Building application...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed
    pause
    exit /b 1
)

REM Package installer
echo Packaging installer...
call npm run dist
if %errorlevel% neq 0 (
    echo Error: Packaging failed
    pause
    exit /b 1
)

echo.
echo Build completed!
echo Installer location: dist\文件推送工具 Setup.exe
echo.
pause
