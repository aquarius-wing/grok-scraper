---
name: grok-scraper
description: Query Grok AI via Playwright to generate answers, analyze text, or get real-time information from X.com. Use when the user specifically asks to query Grok, or when you need up-to-date internet search and analysis via Grok.
---

# Grok Scraper

This skill allows you to query Grok AI (X.com) completely automatically via Playwright, without needing an API key. It works by automating a real browser session.

## Quick Start

When you need to query Grok or the user asks you to "ask Grok":

1. **Locate the script**: The script `scrape.js` is located in this directory (the directory containing this SKILL.md file). You can use `__dirname` or the path of this skill to find it.
   - *Tip: You can use `cd` into this directory before running commands, or use its absolute path.*

2. **Check Session/Login Status**: 
   Before running a query, verify if the session exists in this directory. If the `session/` folder doesn't exist here, inform the user they must login first:
   - Ask the user to open their terminal and run:
     ```bash
     # Give the user the absolute path to this directory
     cd /path/to/this/directory
     node login.js
     ```
   - Tell the user to follow the on-screen instructions (login to X.com in the popped-up browser, then press Enter in the terminal to save the session).
   - Wait for the user to confirm they have logged in before proceeding.

3. **Execute the query**:
   ```bash
   node scrape.js "YOUR DETAILED PROMPT"
   ```
   *Note: Always wrap your prompt in double quotes. If your prompt contains double quotes, escape them or use a heredoc/file.*

4. **Read the result**: The script will output the response to stdout when it succeeds. It also saves the full markdown response in the `output/` subdirectory as `latest.md`. You can read `output/latest.md` if the stdout is truncated.

## Handling Errors and Login Expiration

The script returns specific exit codes:
- **Exit Code 0**: Success. The output contains the Grok response.
- **Exit Code 2**: Login expired or session invalid.
  - **Action required**: Inform the user that the X.com login session has expired.
  - Ask the user to manually run the login script in their terminal:
    ```bash
    # Tell the user to run this in the skill's directory
    node login.js
    ```
  - Tell the user: "Please log in to X.com in the browser window that opens, then return to your terminal and press Enter to save the session."
  - Wait for the user to confirm they have logged in before retrying the query.
- **Exit Code 1 or 3**: Grok service error or timeout. You may retry once after a short delay, or inform the user.

## Prompt Guidelines

- You can ask Grok to perform real-time web searches or Twitter/X searches (e.g., "Search for the latest news about AI").
- You can specify the output format (e.g., "Format the response in Markdown").
- If passing a very long prompt or code block, consider writing the prompt to a temporary file and modifying the command to read from it, or use proper shell escaping.

## Dependencies

This skill requires Node.js and Playwright. If the user hasn't installed dependencies, you may need to run `npm install` in the skill's directory.
