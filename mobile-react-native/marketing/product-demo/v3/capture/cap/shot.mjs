// Screenshot app routes signed in as the demo user. Usage: node shot.mjs out-prefix route [route...]
import { chromium } from 'playwright';
const [, , prefix, ...routes] = process.argv;
const tok = await (await fetch('http://127.0.0.1:54321/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: 'arjun@cheeku.demo' }) })).json();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const uid = tok.user.id;
const place = { lat: 12.9719, lng: 77.6412, label: 'Indiranagar', locality: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560038', countryCode: 'IN', formatted: 'Indiranagar, Bengaluru', provider: 'none' };
const kv = {
  'sb-127-auth-token': JSON.stringify(tok),
  'cheeku.home': JSON.stringify({ uid, stage: 'today', seen: true }),
  'cheeku.locationPrimer': String(Date.now()),
  'cheeku.location': JSON.stringify({ uid, fix: { place, accuracy: 20, at: Date.now(), source: 'search' }, live: false, pinnedUntil: Date.now() + 864e5 * 30 }),
  ...(process.env.KV ? JSON.parse(process.env.KV) : {}),
};
await ctx.addInitScript((kv) => { try { for (const [k, v] of Object.entries(kv)) if (localStorage.getItem(k) === null || k === 'sb-127-auth-token') localStorage.setItem(k, v); } catch {} }, kv);
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('pageerror:', e.message.slice(0, 200)));
let i = 0;
for (const r of routes) {
  await page.goto('http://localhost:8081' + r, { waitUntil: 'networkidle', timeout: 120000 }).catch((e) => console.log('goto', r, e.message));
  await page.waitForTimeout(3500);
  const f = `${prefix}-${String(i++).padStart(2, '0')}.png`;
  await page.screenshot({ path: f });
  console.log(r, '->', f, page.url());
}
await browser.close();
