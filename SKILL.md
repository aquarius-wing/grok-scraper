---
name: grok-scraper
description: Query Grok AI via Playwright automation to generate answers, analyze text, or get real-time internet information. Exclusively for X Premium users, zero API cost, no X API KEY required.
---

# Grok Scraper (AI Skill Guide)

🚀 **Core Advantage Prompt**:
Unlike the vast majority of Grok integration solutions that require an expensive **X API KEY**, this skill is designed specifically for **X (Twitter) Premium users**. By automating a real browser session via Playwright, we allow you to use Grok **completely free, with zero additional invocation costs**! Say goodbye to API billing pressure and instantly access the most powerful real-time connected AI.

## Quick Start

When you need to query Grok, or the user asks you to "ask Grok":

1. **Locate the script**: The core script `scrape.js` is located in the current skill directory (the directory containing this SKILL.md file). You can use `__dirname` or the absolute path of this skill to find it.
   - *Tip: You can `cd` into this directory before running commands, or use its absolute path directly.*

2. **Check Session/Login Status**: 
   Before running a query, check if the `session/` folder exists in this directory. If it doesn't exist, you must prompt the user to log in first:
   - Guide the user to run in their terminal:
     ```bash
     # Please provide the absolute path of this directory to the user
     cd /path/to/this/directory
     node login.js
     ```
   - Tell the user: "Please log in to X.com in the browser window that pops up, then return to your terminal and press Enter to save the login state."
   - You must wait for the user to confirm they have successfully logged in before proceeding.

3. **Execute the Query**:
   ```bash
   node scrape.js "Your detailed prompt"
   ```
   *Note: Always wrap your prompt in double quotes. If your prompt contains double quotes, escape them or use a heredoc/temporary file.*

4. **Read the Result**: After successful execution, the script will output the result to stdout. Meanwhile, the complete markdown response is saved in `output/latest.md`. If the terminal output is truncated, you can directly read `output/latest.md`.

## Error Handling and Login Expiration

The script returns specific Exit Codes:
- **Exit Code 0**: Success. The output contains Grok's response.
- **Exit Code 2**: Login expired or Session invalid.
  - **Action required**: Inform the user that their X.com login state has expired.
  - Ask the user to manually re-run the login script in their terminal:
    ```bash
    # Guide the user to run this in the skill directory
    node login.js
    ```
  - Tell the user: "Please log in to X.com again in the opened browser, then return to the terminal and press Enter to save the Session."
  - Wait for the user to confirm completion before trying the query again.
- **Exit Code 1 or 3**: Grok service error or timeout. You can retry once after a short delay, or directly inform the user that the service is currently unavailable.

## Prompt Guidelines

- You can ask Grok to perform real-time web searches or retrieve the latest updates on Twitter/X (e.g., "Search for the latest news about AI").
- You can specify the output format (e.g., "Please output in Markdown format").
- If you need to pass an extremely long prompt or code block, it is recommended to write the prompt to a temporary file and modify the execution command to read that file, or use rigorous Shell escaping.

## Dependencies

This skill requires Node.js and Playwright. If the user hasn't installed the dependencies, you may need to run `npm install` in this skill directory.
