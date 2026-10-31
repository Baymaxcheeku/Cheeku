// Record a real app flow as video. Usage: node rec.mjs <scenario.mjs> <outdir>
// The scenario exports { profile?, start, run(api) }. Frames come from Chrome's screencast
// (only on change, with timestamps); taps are logged so the video can draw touch ripples.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const [, , scenarioPath, outDir] = process.argv;
const sc = await import(path.resolve(scenarioPath));
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'f'), { recursive: true });

const PROFILES = { arjun: 'b1111111-1111-4111-8111-111111111111', priya: 'b2222222-2222-4222-8222-222222222222', tara: 'b3333333-3333-4333-8333-333333333333' };
const tok = await (await fetch('http://127.0.0.1:54321/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: 'arjun@cheeku.demo' }) })).json();
const uid = tok.user.id;
const place = { lat: 12.9719, lng: 77.6412, label: 'Indiranagar', locality: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560038', countryCode: 'IN', formatted: 'Indiranagar, Bengaluru', provider: 'none' };
const kv = {
  'sb-127-auth-token': JSON.stringify(tok),
  'cheeku.home': JSON.stringify({ uid, stage: 'today', seen: true }),
  'cheeku.locationPrimer': String(Date.now()),
  'cheeku.location': JSON.stringify({ uid, fix: { place, accuracy: 20, at: Date.now(), source: 'search' }, live: false, pinnedUntil: Date.now() + 864e5 * 30 }),
  baymax_profile: PROFILES[sc.profile || 'arjun'],
  ...(sc.kv || {}),
};

const W = 393, H = Number(process.env.VH || 778), DPR = 2;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
await ctx.addInitScript((kv) => {
  try { if (!sessionStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } } catch {}
  // keep dev-only warning toasts (LogBox) off the recording
  const noop = () => {};
  for (const k of ['error', 'warn']) { try { Object.defineProperty(console, k, { get: () => noop, set: () => {}, configurable: false }); } catch {} }
  // hide the web scrollbar and the text caret blink jitter
  const st = document.createElement('style');
  st.textContent = '::-webkit-scrollbar{display:none} *{scrollbar-width:none}';
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
}, kv);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message.slice(0, 160)));

// warm up: load the start route before recording so the first frame is settled
await page.goto('http://localhost:8081' + sc.start, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(sc.settle ?? 2500);

const cdp = await ctx.newCDPSession(page);
const frames = []; let t0 = null; let recording = true;
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  if (!recording) return;
  const t = metadata.timestamp; if (t0 === null) t0 = t;
  const f = `f/${String(frames.length).padStart(5, '0')}.jpg`;
  fs.writeFileSync(path.join(outDir, f), Buffer.from(data, 'base64'));
  frames.push({ f, t: t - t0 });
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });
const wall0 = Date.now();
const events = [];
const now = () => Date.now() / 1000; // absolute; rebased on the first frame below
const mark = (name) => events.push({ type: 'mark', name, t: now() });

async function locate(target) {
  if (typeof target === 'object' && target.x !== undefined) return target;
  if (typeof target === 'object' && target.placeholder) target = page.getByPlaceholder(target.placeholder).first();
  else if (typeof target === 'object' && target.text) target = page.getByText(target.text, { exact: !!target.exact }).nth(target.nth || 0);
  else if (typeof target === 'object' && target.role) target = page.getByRole(target.role, { name: target.name }).first();
  const loc = typeof target === 'string' ? page.getByText(target, { exact: false }).first() : target;
  await loc.waitFor({ state: 'visible', timeout: 20000 });
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
const api = {
  page, mark,
  wait: (ms) => page.waitForTimeout(ms),
  shot: (name) => page.screenshot({ path: path.join(outDir, 'dbg-' + name + '.png') }),
  async tap(target, { hold = 90, after = 0 } = {}) {
    const p = await locate(target);
    events.push({ type: 'tap', x: p.x / W, y: p.y / H, t: now() });
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(hold); await page.mouse.up();
    if (after) await page.waitForTimeout(after);
  },
  async type(text, { cps = 16 } = {}) { await page.keyboard.type(text, { delay: 1000 / cps }); },
  async scroll(dy, ms = 900, at = { x: W / 2, y: H * 0.55 }) {
    // eased wheel steps so the list glides like a flick
    await page.mouse.move(at.x, at.y);
    const n = Math.max(8, Math.round(ms / 16)); let done = 0;
    for (let i = 1; i <= n; i++) {
      const e = 1 - Math.pow(1 - i / n, 3); const target = Math.round(dy * e);
      await page.mouse.wheel(0, target - done); done = target; await page.waitForTimeout(16);
    }
  },
  async goto(route) { await page.goto('http://localhost:8081' + route, { waitUntil: 'networkidle' }); },
  async swipeBack() { await page.goBack(); },
};

await page.waitForTimeout(300);
await sc.run(api);
await page.waitForTimeout(400);
const tEnd = Date.now() / 1000;
recording = false;
await cdp.send('Page.stopScreencast');
await browser.close();

// constant 30 fps from change-only frames
const total = Math.max(frames.length ? frames[frames.length - 1].t + 0.1 : 0, tEnd - t0);
let list = 'ffconcat version 1.0\n';
frames.forEach((fr, i) => {
  const d = (i + 1 < frames.length ? frames[i + 1].t : total) - fr.t;
  list += `file '${fr.f}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`;
});
list += `file '${frames[frames.length - 1].f}'\n`;
fs.writeFileSync(path.join(outDir, 'list.txt'), list);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', `fps=30,scale=${W * DPR}:${H * DPR}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', 'clip.mp4'], { cwd: outDir });
for (const e of events) e.t = +(e.t - t0).toFixed(3);
fs.writeFileSync(path.join(outDir, 'events.json'), JSON.stringify({ duration: total, w: W, h: H, events }, null, 1));
fs.rmSync(path.join(outDir, 'f'), { recursive: true, force: true });
console.log(outDir, frames.length, 'frames', total.toFixed(2) + 's', events.filter((e) => e.type === 'tap').length, 'taps');
