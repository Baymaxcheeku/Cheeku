# Product demo videos

| File | What it is |
|---|---|
| `cheeku-product-demo-v3.mp4` | The current demo (1:54). Arjun, Priya and baby Tara, from planning a baby to the longevity engine. The app is recorded running, on an iPhone 15 Pro frame. 1080p, 30 fps, voice-over and music. |
| `cheeku-product-demo-v3-poster.jpg` | The poster frame (also frame 0 of the video, for thumbnails). |
| `STORYBOARD.md` | v3 scene by scene: what the app shows, the voice-over, timings and what each claim rests on. |
| `v3/` | Everything needed to rebuild v3, including the rig that records the real app. |
| `cheeku-product-demo-v2.mp4`, `v2/` | The previous cut, with screens rebuilt in Remotion. |
| `product-demo-v1.mp4` | The first demo (1:52), kept as the format baseline. |

## Rebuilding v3

These steps need:

- Node 20 or later;
- Python 3.11;
- ffmpeg;
- PostgreSQL 16;
- Chromium, through Playwright.

### 1. Record the app

This step needs the app (`mobile-react-native`) and a local stand-in for Supabase.

```bash
cd marketing/product-demo/v3/capture/stack
npm install
# a Postgres 16 cluster on port 54322 with socket dir /tmp, then:
createdb -h /tmp -p 54322 -U postgres app
psql -h /tmp -p 54322 -U postgres -d app -f shims.sql
for f in ../../../../../supabase/migrations/0*.sql; do psql -h /tmp -p 54322 -U postgres -d app -1 -f $f; done
psql -h /tmp -p 54322 -U postgres -d app -f seed-base.sql
for f in demo-sql/demo-step-*.sql; do psql -h /tmp -p 54322 -U postgres -d app -f $f; done   # run in numeric order
./restart.sh                     # the stand-in API on :54321
```

Then start the app against it. In `mobile-react-native/.env.local`, set:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=demo-anon
EXPO_PUBLIC_CHAT_MODEL=edge
```

Run `npx expo start --web --port 8081`.

To record the medicine check, copy `v3/design/medicine-check.tsx` into `mobile-react-native/app/` while recording, and remove it afterwards.

Then record every clip in story order:

```bash
cd ../cap && ./run_all.sh
```

### 2. Build the video

```bash
cd marketing/product-demo/v3
npm install
python3 -m venv .venv && . .venv/bin/activate && pip install kokoro-onnx soundfile numpy
mkdir -p models && curl -L -o models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx \
  && curl -L -o models/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
mkdir -p public/vo3
python prep.py       # copies the clips into public/clips, tap logs and edge colours into src/
python vo.py         # voice-over lines from script.json
python timeline.py   # scene timings around the measured lines
python music.py      # the score
python mix.py        # voice + ducked music + tap sounds synced to the recordings
npx remotion render src/index.ts Demo out/demo.mp4 --codec=h264 --crf=17 --audio-bitrate=320k --pixel-format=yuv420p
```

### Making changes

- **Which part of each recording plays:** set in `src/segments.json`, as source seconds and a speed for each scene.
- **The copy and the facts on the right:** in `src/story.tsx`.
- **The iPhone frame and the clip player:** in `src/device.tsx`.
- **Browser path:** `remotion.config.ts` points at the sandbox's headless Chromium. Remove that line on a laptop and Remotion uses its own browser.

The voice is Kokoro-82M (Apache 2.0). The score and sound effects are original, so there are no third-party music licences.
