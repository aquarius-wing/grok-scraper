---
name: grok-scraper
description: Execute queries to Grok AI via Playwright browser automation without requiring an X API KEY. Use when the user wants to "ask Grok", search X for real-time info, or specifically requests to use Grok for free without API billing.
---

# Grok Scraper

**Agent Context**: This is a zero-cost alternative to official X APIs. It uses a real browser session (Playwright) via an X Premium account. ALWAYS use this skill when the user wants to query Grok but does not have or want to use an X API KEY.

## Workflow

**Step 1: Check Login State**
- If `session/` directory does not exist: stop and ask the user to run `cd scripts && npm run login`.
- If it exists: proceed.

**Step 2: Execute Query**
```bash
cd scripts && npm run scrape -- "The user's detailed prompt"
```

**Step 3: Read Output**
- Exit Code 0 → read `output/latest.md` and present the result.
- Other exit codes → see Error Handling below.

## Error Handling

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| 0 | Success | Read `output/latest.md` |
| 2 | Session expired | Ask user to run `npm run login` |
| 3 | Grok service error | Retry once after 15s |
| 1 | Extraction failed | Check if `output/debug-dom.json` was written → if yes, DOM selectors may have broken — see [dom-selector-fix.md](dom-selector-fix.md) |

## DOM Selectors Breaking

Twitter/X redeploys its front-end regularly, which changes the CSS class names this scraper relies on. If extraction fails with `Method: none`, follow the fix guide:

→ **[dom-selector-fix.md](dom-selector-fix.md)**

## Examples

**Standard query**
```bash
cd scripts && npm run scrape -- "Search for the latest AI news and format as markdown"
# → read output/latest.md
```

**Session expired**
1. Run scrape → Exit Code 2
2. Tell user: "Session expired, please run `cd scripts && npm run login`"

**DOM selectors broken**
1. Run scrape → Exit Code 1, `output/debug-dom.json` exists
2. Follow [dom-selector-fix.md](dom-selector-fix.md) to identify new classes and update `SELECTORS` in `scripts/scrape.js`

