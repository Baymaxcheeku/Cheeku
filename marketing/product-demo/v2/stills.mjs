import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition, openBrowser } from '@remotion/renderer';
import path from 'path';
const frames = process.argv.slice(3).map(Number); const prefix = process.argv[2];
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const puppeteerInstance = await openBrowser('chrome', { browserExecutable });
const composition = await selectComposition({ serveUrl, id: 'Silent', puppeteerInstance });
for (const frame of frames) {
  await renderStill({ composition, serveUrl, frame, output: `stills/${prefix}_${String(frame).padStart(4, '0')}.jpg`, imageFormat: 'jpeg', jpegQuality: 88, puppeteerInstance, scale: 0.5 });
  console.log('ok', frame);
}
await puppeteerInstance.close({ silent: true });
