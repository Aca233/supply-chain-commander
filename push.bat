@echo off
chcp 65001 >nul
echo ========================================
echo    GitHub 一键推送脚本
echo ========================================
echo.

:: 检查是否有更改
git status --porcelain > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if "%STATUS%"=="" (
    echo [信息] 没有检测到任何更改，无需推送。
    pause
    exit /b 0
)

:: 显示当前更改
echo [更改列表]
git status --short
echo.

:: 获取提交信息
set /p COMMIT_MSG="请输入提交信息 (直接回车使用默认信息): "

if "%COMMIT_MSG%"=="" (
    :: 生成默认提交信息（包含日期时间）
    for /f "tokens=1-3 delims=/" %%a in ('date /t') do set DATE=%%c-%%a-%%b
    for /f "tokens=1-2 delims=:" %%a in ('time /t') do set TIME=%%a:%%b
    set COMMIT_MSG=update: %DATE% %TIME%
)

echo.
echo [执行] git add -A
git add -A
if %ERRORLEVEL% neq 0 (
    echo [错误] git add 失败！
    pause
    exit /b 1
)

echo [执行] git commit -m "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"
if %ERRORLEVEL% neq 0 (
    echo [错误] git commit 失败！
    pause
    exit /b 1
)

echo [执行] git push origin main
git push origin main
if %ERRORLEVEL% neq 0 (
    echo [错误] git push 失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo    推送成功！
echo ========================================
echo.
pause
