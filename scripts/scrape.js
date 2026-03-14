/**
 * scrape.js — Playwright 全程浏览器操作 (v6)
 *
 * 策略改进（vs v5）:
 *   - 两阶段检测：先等待回复开始（检测新增内容），再等待回复完成（内容稳定）
 *   - 更智能的稳定判断：搜索/思考阶段文本短暂稳定不算完成
 *   - 检测实质性回复内容（Markdown 标题、长段落等）才认为是真正的回复
 *   - 清晰的 success/failure 输出
 *
 * 用法:
 *   npm run scrape                    # 默认 prompt
 *   npm run scrape -- "自定义 prompt"  # 自定义
 *
 * 退出码: 0=成功, 1=失败, 2=登录失效
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_DIR = path.join(__dirname, '..', 'session');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

const DEFAULT_PROMPT = `What are the top AI hot topics and trending discussions on Twitter/X in the past 24 hours? Search in English. For each topic, provide:
1. A brief summary
2. Why it's trending
3. Source links (tweet URLs or relevant links)

Format the response in Markdown.`;

const PROMPT = process.argv[2] || DEFAULT_PROMPT;

/**
 * 判断新增文本是否看起来像 Grok 的"思考/搜索"阶段而非最终回复
 */
function isThinkingPhase(text) {
  if (!text || text.length < 10) return true;

  const thinkingSignals = [
    /^(thinking|searching|analyzing|exploring|pulling|running|executing|computing|querying)/im,
    /about the user's request/i,
    /Switching to/i,
    /Using since:/i,
    /within_time:/i,
    /xai:tool_usage_card/i,
    /code_execution/i,
    /x_keyword_search/i,
    /x_semantic_search/i,
    /tool_name/i,
    /tool_args/i,
    /citation_card/i,
    /快速回答/,
    /自动$/m,
  ];

  const matchCount = thinkingSignals.filter(r => r.test(text)).length;
  return matchCount >= 2;
}

/**
 * 判断新增文本是否包含实质性回复内容
 */
function hasSubstantiveReply(text) {
  if (!text) return false;
  // 清理掉思考阶段的噪音
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 信号：有 Markdown 标题、编号列表、长段落、链接等
  const hasHeaders = lines.some(l => /^#{1,3}\s+\S/.test(l));
  const hasNumberedList = lines.some(l => /^\d+\.\s+\*?\*?\S/.test(l));
  const hasLinks = lines.some(l => /https?:\/\/\S+/.test(l));
  const hasLongParagraphs = lines.some(l => l.length > 150);
  const totalContentLength = lines.filter(l => l.length > 30).join('').length;

  // 至少满足其中一些条件
  if (totalContentLength > 500 && (hasHeaders || hasNumberedList || hasLongParagraphs)) return true;
  if (totalContentLength > 1000) return true;
  if (hasHeaders && hasLinks) return true;

  return false;
}

/**
 * 从 afterText 中提取相对于 beforeText 的新增内容
 */
function getNewContent(beforeText, afterText) {
  if (!beforeText) return afterText;

  // 尝试精确前缀匹配
  const prefixLen = Math.min(beforeText.length, 200);
  const prefix = beforeText.slice(0, prefixLen);
  if (afterText.startsWith(prefix)) {
    return afterText.slice(beforeText.length).trim();
  }

  // 退路：直接返回 afterText 尾部
  if (afterText.length > beforeText.length) {
    return afterText.slice(beforeText.length - 100).trim();
  }
  return afterText;
}

/**
 * 两阶段等待：
 *   Phase 1: 等待新增内容出现（包含搜索/思考阶段，容忍短暂稳定）
 *   Phase 2: 检测到实质性回复内容后，等待其稳定
 */
async function waitForReply(page, beforeText, {
  pollMs = 3000,
  stableRounds = 5,
  timeoutMs = 240000,
  thinkingTimeoutMs = 90000,   // thinking 阶段最多等 90s，超出视为卡死
} = {}) {
  const start = Date.now();
  let lastLen = 0;
  let stableCount = 0;
  let phase = 'waiting';     // waiting → thinking → replying → stable
  let replyDetectedAt = 0;
  let lastNewContent = '';

  // 错误关键词：检测到就立即退出
  const ERROR_SIGNALS = [
    '出错了，请刷新',
    'Something went wrong',
    'Try again',
    'Reconnect',
  ];

  let thinkingStart = null;
  let thinkingLastGrowth = null;  // 最后一次内容增长的时间

  while (Date.now() - start < timeoutMs) {
    try {
      await page.waitForTimeout(pollMs);
    } catch (e) {
      // 浏览器/页面被关闭时优雅退出
      console.log(`📊 ⚠️ Page closed: ${e.message}`);
      return { ok: false, currentText: '', newContent: '', forced: false, error: 'Page closed' };
    }

    let currentText = '';
    try {
      currentText = await page.evaluate(() => document.body.innerText);
    } catch (e) {
      console.log(`📊 ⚠️ Unable to read page content: ${e.message}`);
      return { ok: false, currentText: '', newContent: '', forced: false, error: 'Page closed' };
    }

    const len = currentText.length;
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const newContent = getNewContent(beforeText, currentText);

    // 检测 Grok 网络/服务错误
    const errorSignal = ERROR_SIGNALS.find(s => currentText.includes(s));
    if (errorSignal) {
      console.log(`📊 ${elapsed}s — ❌ Error detected: "${errorSignal}", exiting early`);
      return { ok: false, currentText, newContent, forced: false, error: errorSignal };
    }

    if (len > lastLen) {
      stableCount = 0;
      const growth = len - lastLen;

      if (phase === 'waiting') {
        phase = 'thinking';
        thinkingStart = Date.now();
        thinkingLastGrowth = Date.now();
        console.log(`📊 ${elapsed}s — [thinking] Content started growing (+${growth}, total ${len})`);
      } else if (phase === 'thinking' || phase === 'replying') {
        thinkingLastGrowth = Date.now();  // 有增长就刷新
        // 检查新增内容是否已经包含实质性回复
        if ((!isThinkingPhase(newContent) && hasSubstantiveReply(newContent)) || len > 2000) {
          if (phase !== 'replying') {
            phase = 'replying';
            replyDetectedAt = Date.now();
            console.log(`📊 ${elapsed}s — [replying] ✨ Substantive reply content detected (+${growth}, total ${len})`);
          } else {
            console.log(`📊 ${elapsed}s — [replying] Reply still growing (+${growth}, total ${len})`);
          }
        } else {
          console.log(`📊 ${elapsed}s — [thinking] Content growing (+${growth}, total ${len})`);
        }
      }
    } else {
      stableCount++;

      // thinking 阶段超时检测：距上次内容增长超过 thinkingTimeoutMs 才算卡死
      if (phase === 'thinking' && thinkingLastGrowth && (Date.now() - thinkingLastGrowth) > thinkingTimeoutMs) {
        const stuckSec = Math.floor((Date.now() - thinkingLastGrowth) / 1000);
        console.log(`📊 ${elapsed}s — ❌ thinking phase no growth for ${stuckSec}s, Grok might be stuck`);
        return { ok: false, currentText, newContent, forced: false, error: 'Thinking timeout' };
      }

      if (phase === 'waiting') {
        console.log(`📊 ${elapsed}s — [waiting] Waiting for reply... (${len})`);
      } else if (phase === 'thinking') {
        // 在思考阶段，稳定了也不能太早退出
        // 检查新增内容是否已有实质性回复
        if (hasSubstantiveReply(newContent)) {
          phase = 'replying';
          replyDetectedAt = Date.now();
          console.log(`📊 ${elapsed}s — [replying] ✨ Thinking stable, but substantive content already exists stable=${stableCount}/${stableRounds}`);
        } else if (stableCount >= stableRounds + 3) {
          // 思考阶段稳定了很久但没有实质内容 → 可能还在等
          // 重置 stable 继续等
          console.log(`📊 ${elapsed}s — [thinking] Thinking phase stable for ${stableCount} rounds, but no substantive content, keep waiting...`);
          if (stableCount >= stableRounds + 8) {
            // 等了太久了，可能思考就是全部了，强制检查
            console.log(`📊 ${elapsed}s — [thinking] Waited too long, forcing content check...`);
            lastNewContent = newContent;
            return { ok: true, currentText, newContent, forced: true };
          }
        } else {
          console.log(`📊 ${elapsed}s — [thinking] Thinking phase stable ${stableCount}/${stableRounds + 3}`);
        }
      } else if (phase === 'replying') {
        console.log(`📊 ${elapsed}s — [replying] Stable ${stableCount}/${stableRounds}`);
        if (stableCount >= stableRounds) {
          lastNewContent = newContent;
          return { ok: true, currentText, newContent, forced: false };
        }
      }
    }

    lastLen = len;
    lastNewContent = newContent;
  }

  return { ok: false, currentText: await page.evaluate(() => document.body.innerText), newContent: lastNewContent, forced: false };
}

/**
 * 清理回复文本：去掉用户 prompt、思考过程、建议问题等
 */
function cleanReply(newContent, userPrompt) {
  let text = newContent;

  // 去掉用户 prompt（可能出现在开头）
  const promptPreview = userPrompt.substring(0, 60);
  const promptIdx = text.indexOf(promptPreview);
  if (promptIdx !== -1 && promptIdx < 200) {
    text = text.slice(promptIdx + userPrompt.length).trim();
  }

  // 去掉 Grok 思考/搜索阶段的标记
  const thinkingPatterns = [
    /Thinking about.*?\n/gi,
    /Searching\s+\w+.*?\n/gi,
    /about the user's request\n?/gi,
    /Switching to.*?\n/gi,
    /Using since:.*?\n/gi,
    /快速回答\n?自动\n?/g,
    /^\d+\s*秒\s*\n/gm,                              // "13 秒" 之类的残留时间标记
    /<xai:.*?<\/xai:.*?>/gs,                         // XML tool cards
    /<grok:.*?<\/grok:.*?>/gs,                       // citation cards
    /<grok:render[^>]*\/>/g,                         // self-closing render tags
    /<argument[^>]*>.*?<\/argument>/gs,              // argument tags
  ];

  for (const pattern of thinkingPatterns) {
    text = text.replace(pattern, '');
  }

  // 如果文本以 Markdown 标题开头之前有短碎片，去掉它们
  const firstHeaderIdx = text.search(/^#\s/m);
  if (firstHeaderIdx > 0 && firstHeaderIdx < 200) {
    const preHeader = text.slice(0, firstHeaderIdx).trim();
    // 如果标题前的内容很短且不像正文，去掉
    if (preHeader.length < 100 && !preHeader.includes('http')) {
      text = text.slice(firstHeaderIdx);
    }
  }

  // 去掉末尾的建议问题（通常是几个短行）
  const lines = text.split('\n');
  let endIdx = lines.length;

  // 从末尾往前找：连续的短行（<100字）且不是 Markdown 列表项
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (line.length < 100 && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*') && !/^\d+\./.test(line) && !line.includes('http')) {
      endIdx = i;
    } else {
      break;
    }
  }

  text = lines.slice(0, endIdx).join('\n');

  // 清理多余空行
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

// ========== MAIN ==========
(async () => {
  if (!fs.existsSync(SESSION_DIR)) {
    console.error('❌ Session does not exist, please run: npm run login first');
    process.exit(2);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      🐾 Grok Scraper v6 — Starting      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  console.log('🐾 Starting browser...');
  const context = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('🌐 Opening Grok...');
  await page.goto('https://x.com/i/grok', { waitUntil: 'domcontentloaded', timeout: 30000 });

  try {
    await page.waitForSelector('textarea', { timeout: 30000, state: 'visible' });
  } catch {
    if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
      console.error('');
      console.error('╔══════════════════════════════════════════╗');
      console.error('║  ❌ FAILED — Login expired               ║');
      console.error('║  Run: npm run login                      ║');
      console.error('╚══════════════════════════════════════════╝');
      await context.close();
      process.exit(2);
    }
    console.error('❌ Page load error, URL:', page.url());
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'error-screenshot.png') });
    await context.close();
    process.exit(1);
  }

  console.log('✅ Page loaded, textarea is ready');

  // 记录发送前的页面文本
  const beforeText = await page.evaluate(() => document.body.innerText);
  console.log(`📏 Page text before sending: ${beforeText.length} chars`);

  // 输入 prompt 并发送
  console.log('📝 Entering prompt...');
  const textarea = page.locator('textarea').first();
  await textarea.click();
  await page.waitForTimeout(500);
  await textarea.fill(PROMPT);
  await page.waitForTimeout(500);

  console.log('📤 Prompt sent, waiting for Grok reply...');
  const startTime = Date.now();
  await page.keyboard.press('Enter');

  // 两阶段等待
  const result = await waitForReply(page, beforeText, {
    pollMs: 3000,
    stableRounds: 5,
    timeoutMs: 240000,
  });

  const elapsed = Math.floor((Date.now() - startTime) / 1000);

  // 截图留档
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'final-screenshot.png') });
  await context.close();
  console.log(`🔒 Browser closed (${elapsed}s)`);

  if (!result.ok) {
    const reason = result.error ? `Grok error: ${result.error}` : 'Timeout waiting for reply';
    console.error('');
    console.error('╔══════════════════════════════════════════╗');
    console.error('║  ❌ FAILED                               ║');
    console.error(`║  ${reason.substring(0, 40).padEnd(40)}║`);
    console.error(`║  Elapsed: ${elapsed}s                          ║`);
    console.error('╚══════════════════════════════════════════╝');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'debug-aftertext.txt'), result.currentText || 'empty');
    // exit 3 = Grok service/thinking error (retryable), 1 = timeout (not retried)
    const retryable = result.error && result.error !== 'Page closed';
    process.exit(retryable ? 3 : 1);
  }

  // 提取并清理回复
  const reply = cleanReply(result.newContent, PROMPT);

  if (!reply || reply.length < 100) {
    console.error('');
    console.error('╔══════════════════════════════════════════╗');
    console.error('║  ❌ FAILED — Reply too short              ║');
    console.error(`║  Length: ${reply ? reply.length : 0} chars (min: 100)        ║`);
    console.error(`║  Forced: ${result.forced}                         ║`);
    console.error('╚══════════════════════════════════════════╝');
    console.error('\n--- Raw new content ---\n');
    console.error(result.newContent?.substring(0, 2000));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'debug-aftertext.txt'), result.currentText || 'empty');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'debug-newcontent.txt'), result.newContent || 'empty');
    process.exit(1);
  }

  // 保存结果
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outFile = path.join(OUTPUT_DIR, `grok-${ts}.md`);
  const output = `# Grok AI Report\n\n_Generated: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}_\n\n---\n\n${reply}`;
  fs.writeFileSync(outFile, output, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'latest.md'), output, 'utf-8');

  // ========== SUCCESS OUTPUT ==========
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  ✅ SUCCESS — Grok reply captured!       ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  📄 File: ${path.basename(outFile).padEnd(29)}║`);
  console.log(`║  📏 Length: ${String(reply.length).padEnd(28)}║`);
  console.log(`║  ⏱️  Time: ${String(elapsed + 's').padEnd(28)}║`);
  console.log(`║  🧹 Cleaned: ${result.forced ? 'forced' : 'normal'}${' '.repeat(result.forced ? 21 : 22)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('--- Grok Reply Preview (first 500 chars) ---');
  console.log('');
  console.log(reply.substring(0, 500));
  if (reply.length > 500) console.log('\n... (truncated)');
  console.log('');
  console.log('🐾 Done!');

  process.exit(0);
})();
