# 文件推送工具 - 构建脚本
#!/bin/bash

echo "正在构建文件推送工具..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js未安装，请先安装Node.js 18+"
    exit 1
fi

# 检查ADB是否安装
if ! command -v adb &> /dev/null; then
    echo "警告: ADB未安装，Android设备支持将不可用"
    echo "请安装Android SDK Platform Tools"
fi

# 检查iOS工具是否安装
if ! command -v idevice_id &> /dev/null; then
    echo "警告: iOS工具未安装，iOS设备支持将不可用"
    echo "请安装libimobiledevice"
fi

# 安装依赖
echo "正在安装依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败"
    exit 1
fi

# 构建应用
echo "正在构建应用..."
npm run build
if [ $? -ne 0 ]; then
    echo "错误: 构建失败"
    exit 1
fi

# 打包应用
echo "正在打包应用..."
npm run dist
if [ $? -ne 0 ]; then
    echo "错误: 打包失败"
    exit 1
fi

echo ""
echo "构建完成！"
echo "安装程序位置: dist/"
echo ""