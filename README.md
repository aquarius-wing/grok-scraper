# Grok Scraper 🐾

通过 Playwright 浏览器自动化，使用 X Premium 会员的 Grok 功能，定时抓取 AI 热点。

## 文件结构

```
grok-scraper/
├── login.js       # 首次登录：启动浏览器让你手动登录
├── scrape.js      # 核心脚本：发送 prompt、抓取回复
├── run.sh         # 定时任务入口（带登录失效检测）
├── session/       # 浏览器 session 数据（登录后自动生成）
└── output/        # 抓取结果
    ├── latest.md  # 最新一次结果
    └── grok-*.md  # 历史结果（按时间戳命名）
```

## 使用

### 1. 首次登录
```bash
node login.js
# 在打开的浏览器中登录 x.com
# 登录完成后回到终端按 Enter
```

### 2. 测试抓取
```bash
node scrape.js
```

### 3. 自定义 prompt
```bash
node scrape.js "你的自定义问题"
```

### 4. 定时执行
cron 已配置，每 6 小时执行一次。
