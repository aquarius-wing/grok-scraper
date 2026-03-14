# Grok Scraper 🐾

> 🚀 **Break free from API billing shackles and unleash the true potential of Grok AI at zero cost!**

Most X AI (Grok) integration tools on the market require you to apply for and bind an expensive **X API KEY**. Not only is the barrier to entry extremely high, but costs also skyrocket as your conversation volume increases.

**Grok Scraper brings a game-changing solution:**
This project is built exclusively for **X (Twitter) Premium users**! Through Playwright browser automation, we allow you to **bypass API restrictions and use Grok's powerful features at zero additional cost**. As long as you are a Premium member, you can enjoy **truly free invocations** with absolutely no API billing anxiety. Out of the box and ready to go!

---

## 🌟 Core Advantages

- 💰 **Absolutely Zero Cost**: No need to purchase an X API KEY or pay per token. X Premium users can use it directly for free.
- 🚀 **Out of the Box**: Skip the tedious developer account application and API configuration. Just log in to the webpage and start automated queries.
- 🌐 **Native Experience**: Based on a real browser environment, it perfectly simulates human interaction to obtain the most authentic Grok real-time web search and conversational capabilities.

---

## 📁 File Structure

```text
grok-scraper/
├── login.js       # First login: Launches the browser for manual login
├── scrape.js      # Core script: Sends prompts and scrapes responses
├── run.sh         # Cron job entry point (with session expiration detection)
├── session/       # Browser session data (auto-generated after login)
└── output/        # Scraped results
    ├── latest.md  # The most recent result
    └── grok-*.md  # Historical results (named by timestamp)
```

## 🚀 Usage Guide

### 1. First Login
```bash
node login.js
# Log in to x.com in the opened browser
# Return to the terminal and press Enter after logging in
```

### 2. Test Scraping
```bash
node scrape.js
```

### 3. Custom Prompt
```bash
node scrape.js "Your custom question"
```

### 4. Scheduled Execution
Cron is configured to run every 6 hours.
