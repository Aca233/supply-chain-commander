# GitHub 一键推送脚本 (PowerShell)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   GitHub 一键推送脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在 git 仓库中
$isGitRepo = git rev-parse --is-inside-work-tree 2>$null
if (-not $isGitRepo) {
    Write-Host "[错误] 当前目录不是 Git 仓库！" -ForegroundColor Red
    exit 1
}

# 检查是否有更改
$status = git status --porcelain
if (-not $status) {
    Write-Host "[信息] 没有检测到任何更改，无需推送。" -ForegroundColor Yellow
    exit 0
}

# 显示当前更改
Write-Host "[更改列表]" -ForegroundColor Yellow
git status --short
Write-Host ""

# 获取提交信息
$commitMsg = Read-Host "请输入提交信息 (直接回车使用默认信息)"

if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    # 生成默认提交信息（包含日期时间）
    $commitMsg = "update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

Write-Host ""

# 执行 git add
Write-Host "[执行] git add -A" -ForegroundColor Green
git add -A
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] git add 失败！" -ForegroundColor Red
    exit 1
}

# 执行 git commit
Write-Host "[执行] git commit -m `"$commitMsg`"" -ForegroundColor Green
git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] git commit 失败！" -ForegroundColor Red
    exit 1
}

# 执行 git push
Write-Host "[执行] git push origin main" -ForegroundColor Green
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] git push 失败！" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   推送成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
