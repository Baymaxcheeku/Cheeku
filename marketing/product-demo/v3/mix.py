# Final mix: VO on the timeline, music ducked under speech, soft SFX in the score's key, gentle master.
import json, numpy as np, soundfile as sf
SR = 44100; FPS = 30
T = json.load(open('src/timeline.json'))
S = {s['id']: s for s in T['scenes']}
N = int((T['total'] / FPS + 0.6) * SR)
rng = np.random.default_rng(3)

def load(path):
    a, sr = sf.read(path, always_2d=True)
    if sr != SR:  # linear resample (Kokoro is 24 kHz)
        x = np.arange(len(a)) / sr; xi = np.arange(int(len(a) * SR / sr)) / SR
        a = np.stack([np.interp(xi, x, a[:, c]) for c in range(a.shape[1])], 1)
    return a
music = load('music.wav')[:N]; music = np.pad(music, ((0, N - len(music)), (0, 0)))

# ---- voice ----
vo = np.zeros(N); speech = np.zeros(N, bool)
for s in T['scenes']:
    for v in s['vo']:
        a = load('public/vo3/' + v['file'])[:, 0]
        i = int(v['from'] / FPS * SR); a = a[: N - i]
        vo[i:i + len(a)] += a; speech[i:i + len(a)] = True
# gentle VO polish: high-pass rumble, light compression, presence
def onepole_hp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); prev_x = 0; prev_y = 0
    # vectorised via cumulative trick is overkill; do blockwise python loop on decimated grid is slow -> use FFT filter
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** 4); return np.fft.irfft(X * H, len(x))
vo = onepole_hp(vo, 80)
X = np.fft.rfft(vo); fr = np.fft.rfftfreq(len(vo), 1 / SR)
X *= 1 + 0.18 * np.exp(-((fr - 3200) / 1400) ** 2)   # presence lift
vo = np.fft.irfft(X, len(vo))
env = np.convolve(np.abs(vo), np.ones(int(.01 * SR)) / int(.01 * SR), 'same')
thr = 0.08; gain = np.where(env > thr, (thr + (env - thr) / 2.5) / np.maximum(env, 1e-9), 1.0)
vo *= gain; vo /= np.abs(vo).max(); vo *= 0.9

# ---- ducking (smooth) ----
k = int(0.25 * SR); sm = np.convolve(speech.astype(float), np.ones(k) / k, 'same')
duck = 1 - 0.70 * np.clip(sm * 1.6, 0, 1)   # about -7.5 dB under speech
music *= duck[:, None]

# ---- sfx ----
sfx = np.zeros((N, 2))
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
def put(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); sig = sig[: max(0, N - i)] * g
    sfx[i:i + len(sig), 0] += sig * np.sqrt((1 - pan) / 2); sfx[i:i + len(sig), 1] += sig * np.sqrt((1 + pan) / 2)
def tone(m, d, dec=18, h=(1, .3)):
    t = np.arange(int(d * SR)) / SR; return sum(a * np.sin(2 * np.pi * mf(m) * (i + 1) * t) for i, a in enumerate(h)) * np.exp(-t * dec) * np.minimum(1, t / .002)
def tap(): t = np.arange(int(.05 * SR)) / SR; return (np.sin(2 * np.pi * 2100 * t) * .5 + rng.standard_normal(len(t)) * .15) * np.exp(-t * 120) * .35
def pop(m=86): t = np.arange(int(.12 * SR)) / SR; f = mf(m) * (1 + 0.5 * np.exp(-t * 40)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * .3
def whoosh(d=.45):
    n = int(d * SR); t = np.arange(n) / SR; x = rng.standard_normal(n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-((f - 900) / 900) ** 2) + .3 * np.exp(-((f - 3000) / 2000) ** 2); x = np.fft.irfft(X, n); x /= np.abs(x).max()
    return x * np.sin(np.pi * t / d) ** 2 * .16
def fit(x, n): return np.pad(x, (0, max(0, n - len(x))))[:n]
def chime(root=76): n = int(.8 * SR); return fit(tone(root, .5, 7, (1, .4, .15)) * .25, n) + fit(np.pad(tone(root + 7, .7, 6, (1, .4, .15)) * .25, (int(.09 * SR), 0)), n)
def fit(x, n): return np.pad(x, (0, max(0, n - len(x))))[:n]
def sparkle(): return sum(fit(np.pad(tone(m, .4, 10, (1, .2)) * .12, (int(i * .05 * SR), 0)), int(.9 * SR)) for i, m in enumerate([88, 91, 95, 100, 103]))
def tick(): t = np.arange(int(.015 * SR)) / SR; return rng.standard_normal(len(t)) * np.exp(-t * 300) * .05

g = lambda sid: S[sid]['from'] / FPS
lv = lambda sid, i: S[sid]['vo'][i]
def wt(sid, i, word):
    v = lv(sid, i); idx = v['text'].lower().find(word.lower())
    return (v['from'] + v['dur'] * max(0, idx) / len(v['text'])) / FPS
fr = lambda sid, n: g(sid) + n / FPS

# hook: bubbles, paper, search typing, results
tC = wt('hook', 0, 'WhatsApp') - 8 / FPS; tP = wt('hook', 0, 'paper') - 6 / FPS; tS = wt('hook', 0, 'late-night') - 6 / FPS
for i in range(4): put(pop(84 + (i % 2) * 5), tC + i * 7 / FPS, pan=-.5)
for i in range(3): put(whoosh(.3), tP + i * 6 / FPS, pan=0, g=.7)
for i in range(28): put(tick(), tS + 6 / FPS + i / 30 * 1.0, pan=.5)
for i in range(3): put(pop(79), tS + (30 + i * 8) / FPS, pan=.5, g=.7)
put(whoosh(.7), g('meet') - .5, g=1.0)
put(whoosh(.5), g('meet') + 80 / FPS, g=.8)
# phone content: a push between scenes, and a soft tap for every real tap in the recordings
SEG = json.load(open('src/segments.json')); EVS = json.load(open('src/events.json'))
closeEnd = (S['close']['vo'][1]['from'] - S['close']['from'] - 14)
for sid, segs in SEG.items():
    base = g(sid) + ((closeEnd - 10) / FPS if sid == 'close' else 0)
    if sid not in ('meet', 'close'): put(whoosh(.36), base - .05, pan=.2, g=.75)
    start = 0.0; scene_end = (S[sid]['from'] + S[sid]['dur']) / FPS
    for sg in segs:
        r = sg.get('rate', 1); L = (sg['to'] - sg['from']) / r
        for e in EVS[sg['clip']]['events']:
            if e['type'] == 'tap' and sg['from'] - .05 <= e['t'] <= sg['to']:
                t = base + start + (e['t'] - sg['from']) / r
                if t < scene_end: put(tap(), t, pan=.15, g=.9)
        start += L
# confirmations and happy moments
put(chime(76), g('labs') + 4.1); put(chime(80), g('gyne') + 7.0); put(chime(76), g('fit') + 3.0)
put(sparkle(), g('preg') + 0.55, g=1.2); put(sparkle(), g('baby') + 2.6, g=1.2); put(chime(80), g('baby') + 2.5)
put(chime(71), g('fever') + 3.0, g=.7); put(chime(73), g('after') + 0.3, g=.6)
put(sparkle(), lv('close', 1)['from'] / FPS - 14 / FPS, g=1.1)

# reverb the sfx lightly (short room)
def room(x, seed):
    r = np.random.default_rng(seed); n = int(.8 * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 6); ir[:int(.008 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = 1 << int(np.ceil(np.log2(len(x) + n))); return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
sfx = sfx * .8 + np.stack([room(sfx[:, 0], 5), room(sfx[:, 1], 6)], 1) * .25
sfx *= np.where(speech, 0.75, 1.0)[:, None]

mixd = music * 0.62 + sfx * 0.85 + vo[:, None] * 1.12
# master: soft clip + normalise to about -14 LUFS-ish via RMS target, peak ceiling -1 dBFS
mixd = np.tanh(mixd * 1.1) / np.tanh(1.1)
rms = np.sqrt(np.mean(mixd ** 2)); mixd *= 0.135 / rms
mixd = np.clip(mixd, -0.89, 0.89)
fo = int(.6 * SR); mixd[-fo:] *= np.linspace(1, 0, fo)[:, None]
sf.write('public/mix.wav', mixd.astype(np.float32), SR)
print('mix written', round(len(mixd) / SR, 2), 's')
