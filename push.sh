#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   GitHub 一键推送脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# 检查是否在 git 仓库中
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}[错误] 当前目录不是 Git 仓库！${NC}"
    exit 1
fi

# 检查是否有更改
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}[信息] 没有检测到任何更改，无需推送。${NC}"
    exit 0
fi

# 显示当前更改
echo -e "${YELLOW}[更改列表]${NC}"
git status --short
echo

# 获取提交信息
read -p "请输入提交信息 (直接回车使用默认信息): " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    # 生成默认提交信息（包含日期时间）
    COMMIT_MSG="update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo

# 执行 git add
echo -e "${GREEN}[执行]${NC} git add -A"
git add -A
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误] git add 失败！${NC}"
    exit 1
fi

# 执行 git commit
echo -e "${GREEN}[执行]${NC} git commit -m \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误] git commit 失败！${NC}"
    exit 1
fi

# 执行 git push
echo -e "${GREEN}[执行]${NC} git push origin main"
git push origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误] git push 失败！${NC}"
    exit 1
fi

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   推送成功！${NC}"
echo -e "${GREEN}========================================${NC}"
echo
