# Grok Scraper 🐾

[English](./README.md) | [中文](./README_zh.md)

> 🚀 **Break free from API billing shackles and unleash the true potential of Grok AI at zero cost!**

Most X AI (Grok) integration tools on the market require you to apply for and bind an expensive **X API KEY**. Not only is the barrier to entry extremely high, but costs also skyrocket as your conversation volume increases.

**Grok Scraper brings a game-changing solution:**
This project is built exclusively for **X (Twitter) Premium users**! Through Playwright browser automation, we allow you to **bypass API restrictions and use Grok's powerful features at zero additional cost**. As long as you are a Premium member, you can enjoy **truly free invocations** with absolutely no API billing anxiety. Out of the box and ready to go!

---

## 🎬 Preview

<video src="./assets/grok-2026-03-15T10-01-45.webm" controls width="100%"></video>

---

## 🌟 Core Advantages

- 💰 **Absolutely Zero Cost**: No need to purchase an X API KEY or pay per token. X Premium users can use it directly for free.
- 🚀 **Out of the Box**: Skip the tedious developer account application and API configuration. Just log in to the webpage and start automated queries.
- 🌐 **Native Experience**: Based on a real browser environment, it perfectly simulates human interaction to obtain the most authentic Grok real-time web search and conversational capabilities.

---

## 📦 Installation

**As an OpenClaw Skill:**
```bash
git clone https://github.com/aquarius-wing/grok-scraper.git ~/.openclaw/skills/grok-scraper
```

---

## 📁 File Structure

```text
grok-scraper/
├── SKILL.md              # Core Agent instructions
├── README.md             # Human-readable documentation
├── scripts/              # All executable scripts
│   ├── package.json      # Dependencies and NPM scripts
│   ├── login.js          # First login: Launches the browser for manual login
│   ├── scrape.js         # Core script: Sends prompts and scrapes responses
│   └── run.sh            # Cron job entry point
├── session/              # Browser session data (auto-generated after login)
└── output/               # Scraped results
    ├── latest.md         # The most recent result
    └── grok-*.md         # Historical results (named by timestamp)
```

---

## 🚀 Usage Guide

### 0. Install Dependencies
```bash
cd scripts
npm install
```

### 1. First Login
```bash
cd scripts
npm run login
# Log in to x.com in the opened browser
# Return to the terminal and press Enter after logging in
```

### 2. Run a Query
```bash
scripts/run.sh "Your custom question"
# Result is written to output/latest.md
```

`run.sh` is the canonical entry point. It handles logging to `output/run.log`, automatic retry on Grok service errors, and creates `output/notify-login-expired` when the session expires.

### 3. Scheduled Execution (Cron)
```bash
crontab -e
```
Add a line to run every 6 hours:
```
0 */6 * * * /path/to/grok-scraper/scripts/run.sh "Your scheduled prompt"
```

### 4. Debugging
For direct inspection without logging or retry logic:
```bash
cd scripts
npm run scrape -- "Your custom question"
```
