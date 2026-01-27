@echo off
chcp 65001 > nul
title 供应链指挥官 - 游戏启动器

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    供应链指挥官                              ║
echo ║              Supply Chain Commander                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 显示 Node.js 版本
echo [信息] Node.js 版本:
node --version
echo.

:: 检查 npm 是否可用
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 npm，请检查 Node.js 安装
    pause
    exit /b 1
)

:: 检查是否需要安装依赖
if not exist "node_modules" (
    echo [安装] 首次运行，正在安装依赖...
    echo 这可能需要几分钟，请耐心等待...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成！
    echo.
) else (
    echo [信息] 依赖已安装，跳过安装步骤
    echo.
)

:: 启动开发服务器
echo [启动] 正在启动游戏...
echo.
echo ════════════════════════════════════════════════════════════════
echo   游戏将在浏览器中打开
echo   如果没有自动打开，请访问: http://localhost:5173
echo   按 Ctrl+C 停止服务器
echo ════════════════════════════════════════════════════════════════
echo.
echo [服务器日志]
echo.

:: 设置环境变量以显示详细日志
set DEBUG=vite:*

:: 启动并打开浏览器（使用 --host 显示网络访问地址）
npm run dev -- --host 2>&1