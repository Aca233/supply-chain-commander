#!/bin/bash

# 供应链指挥官 - 游戏启动器
# Supply Chain Commander - Game Launcher

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    供应链指挥官                              ║"
echo "║              Supply Chain Commander                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误]${NC} 未检测到 Node.js，请先安装 Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 显示 Node.js 版本
echo -e "${GREEN}[信息]${NC} Node.js 版本: $(node --version)"
echo ""

# 检查 npm 是否可用
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[错误]${NC} 未检测到 npm，请检查 Node.js 安装"
    exit 1
fi

# 检查是否需要安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[安装]${NC} 首次运行，正在安装依赖..."
    echo "这可能需要几分钟，请耐心等待..."
    echo ""
    
    npm install
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}[错误]${NC} 依赖安装失败，请检查网络连接"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}[成功]${NC} 依赖安装完成！"
    echo ""
else
    echo -e "${GREEN}[信息]${NC} 依赖已安装，跳过安装步骤"
    echo ""
fi

# 启动开发服务器
echo -e "${GREEN}[启动]${NC} 正在启动游戏..."
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  游戏将在浏览器中打开"
echo "  如果没有自动打开，请访问: http://localhost:5173"
echo "  按 Ctrl+C 停止服务器"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 启动开发服务器
npm run dev