#!/bin/bash
# run.sh — 定时执行 scrape.js，如果登录失效则通知
# 用法: ./run.sh [自定义prompt]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/output/run.log"
NOTIFY_FILE="$SCRIPT_DIR/output/notify-login-expired"

mkdir -p "$SCRIPT_DIR/output"

echo "$(date '+%Y-%m-%d %H:%M:%S') — 开始执行 Grok 抓取" >> "$LOG_FILE"

# 执行抓取
cd "$SCRIPT_DIR"
OUTPUT=$(node scrape.js "$@" 2>&1)
EXIT_CODE=$?

echo "$OUTPUT" >> "$LOG_FILE"

if [ $EXIT_CODE -eq 2 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — ⚠️ 登录已失效" >> "$LOG_FILE"
  # 创建通知标记文件（小木爪的 heartbeat 会检测到这个文件）
  echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$NOTIFY_FILE"
elif [ $EXIT_CODE -eq 0 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — ✅ 抓取成功" >> "$LOG_FILE"
  # 清除可能存在的失效标记
  rm -f "$NOTIFY_FILE"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') — ❌ 抓取失败 (exit $EXIT_CODE)" >> "$LOG_FILE"
fi

exit $EXIT_CODE
