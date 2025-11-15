@echo off
echo 正在构建文件推送工具...

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Node.js未安装，请先安装Node.js 18+
    pause
    exit /b 1
)

REM 检查ADB是否安装
adb version >nul 2>&1
if %errorlevel% neq 0 (
    echo 警告: ADB未安装，Android设备支持将不可用
    echo 请安装Android SDK Platform Tools
)

REM 检查本地 idb.exe 是否存在
if not exist "idb.exe" (
    echo 警告: 未找到本地 idb.exe，iOS设备支持将不可用
    echo 请将 idb.exe 放置在程序根目录
)

REM 安装依赖
echo 正在安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

REM 构建应用
echo 正在构建应用...
call npm run build
if %errorlevel% neq 0 (
    echo 错误: 构建失败
    pause
    exit /b 1
)

REM 打包安装程序
echo 正在打包安装程序...
call npm run dist
if %errorlevel% neq 0 (
    echo 错误: 打包失败
    pause
    exit /b 1
)

echo.
echo 构建完成！
echo 安装程序位置: dist\文件推送工具 Setup.exe
echo.
pause
