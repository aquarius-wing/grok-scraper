/**
 * login.js — 启动有头浏览器，让用户手动登录 x.com，然后保存 session
 * 用法: node login.js
 */

const { chromium } = require('playwright');
const path = require('path');

const SESSION_DIR = path.join(__dirname, 'session');

(async () => {
  console.log('🐾 启动浏览器，请在打开的窗口中登录 x.com ...');
  console.log('📂 Session 将保存到:', SESSION_DIR);
  console.log('');
  console.log('✅ 登录完成后，在终端按 Enter 保存 session 并关闭浏览器。');
  console.log('');

  const context = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    channel: 'chromium',
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://x.com/i/grok');

  // 等待用户按 Enter
  await new Promise((resolve) => {
    process.stdin.setRawMode?.(false);
    process.stdin.resume();
    process.stdin.once('data', resolve);
  });

  console.log('💾 正在保存 session...');
  await context.close();
  console.log('✅ Session 已保存！可以运行 node scrape.js 测试了喵～');
  process.exit(0);
})();
