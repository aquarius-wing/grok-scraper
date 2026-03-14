---
name: grok-scraper
description: Execute queries to Grok AI via Playwright browser automation without requiring an X API KEY. Use when the user wants to "ask Grok", search X for real-time info, or specifically requests to use Grok for free without API billing.
---

# Grok Scraper

**Agent Context**: This is a zero-cost alternative to official X APIs. It uses a real browser session (Playwright) via an X Premium account. ALWAYS use this skill when the user wants to query Grok but does not have or want to use an X API KEY.

## Workflow

When you need to query Grok, follow these exact steps:

**Step 1: Check Login State**
- Check if the `session/` directory exists in this skill's root folder.
- If it DOES NOT exist: You must stop and ask the user to run `node scripts/login.js` in their terminal. Tell them to log in via the opened browser, press Enter in the terminal to save, and inform you when done.
- If it DOES exist: Proceed to Step 2.

**Step 2: Execute Query**
- Run the core script using the Shell tool:
  ```bash
  node scripts/scrape.js "The user's detailed prompt"
  ```
- *Note: Always escape double quotes or use a temporary file if the prompt is complex.*

**Step 3: Read Output**
- If the command succeeds (Exit Code 0), read the generated file at `output/latest.md` to get the complete Grok response.
- Summarize or provide the content directly to the user based on their original request.

## Error Handling

Pay attention to the Exit Codes from `scrape.js`:
- **Exit Code 2 (Session Expired)**: The X.com login state has expired. Stop and ask the user to manually re-run `node scripts/login.js` in their terminal to refresh the session.
- **Exit Code 1 or 3 (Timeout/Error)**: The service is temporarily unavailable. Inform the user of the failure and suggest trying again later.

## Examples

**Example 1: Standard Query Without API Key**
User: "Can you ask Grok about the latest AI news? I don't have an API key."
Action:
1. Agent recognizes the need for a non-API Grok query and selects this skill.
2. Agent verifies `session/` exists.
3. Agent runs `node scripts/scrape.js "Search for the latest AI news and format as markdown"`.
4. Agent reads `output/latest.md` and presents the result to the user.

**Example 2: Session Expired Flow**
Action:
1. Agent runs `node scripts/scrape.js "What is the weather in Tokyo?"`.
2. Agent receives Exit Code 2.
3. Agent stops and tells the user: "Your X.com session has expired. Please run `node scripts/login.js` in your terminal to log in again, then let me know when you're done."