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
        a = load('public/vo/' + v['file'])[:, 0]
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
# transitions (phone pushes)
for sid in ['family', 'plan', 'pregnancy', 'doctor', 'baby', 'homecare', 'fever', 'care', 'engine']: put(whoosh(.38), g(sid) - .05, pan=.2, g=.8)
# taps and confirmations
put(tap(), fr('family', 34)); put(pop(81), fr('family', 34)); put(tap(), wt('family', 0, 'Meera') - 2 / FPS); put(pop(88), wt('family', 0, 'Meera') + 2 / FPS)
put(tap(), fr('plan', 6))
msg = "We're trying for a baby. What should Meera and I do first?"; tType = 22; tSend = tType + int(np.ceil(len(msg) / 30 * 30)) + 6
for i in range(0, len(msg), 2): put(tick(), fr('plan', tType) + i / 30, pan=-.1)
put(tap(), fr('plan', tSend - 2)); put(pop(83), fr('plan', tSend))
tTap = lv('plan', 2)['from'] - S['plan']['from'] + 34; put(tap(), fr('plan', tTap)); put(chime(76), fr('plan', tTap + 6))
put(sparkle(), fr('positive', lv('positive', 0)['from'] - S['positive']['from'] + 12), g=1.2)
pc = (wt('pregnancy', 1, 'quick check') - g('pregnancy')) * FPS - 4
put(chime(71), fr('pregnancy', pc + 38), g=.7)
p1 = (wt('doctor', 0, 'her doctor') - g('doctor')) * FPS - 8; put(tap(), fr('doctor', p1 + 16)); put(tap(), fr('doctor', p1 + 62)); put(chime(76), fr('doctor', p1 + 68))
put(tap(), fr('baby', 54)); put(chime(80), fr('baby', 60)); put(sparkle(), fr('baby', 62))
put(tap(), fr('homecare', 20)); put(tap(), fr('homecare', 64)); put(chime(76), fr('homecare', 70))
p2 = (wt('homecare', 0, 'physio') - g('homecare')) * FPS - 4; put(tap(), fr('homecare', p2 + 30)); put(chime(80), fr('homecare', p2 + 36))
tCall = (wt('fever', 0, 'see a doctor') - g('fever')) * FPS + 30; put(tap(), fr('fever', tCall)); put(chime(73), fr('fever', tCall + 6), g=.8)
for w in ['Doctors', 'labs', 'medicines', 'therapy', 'dental', 'eyes', 'physio', 'home care', 'ambulance']: put(pop(86 + (hash(w) % 5)), wt('care', 0, w) - 4 / FPS, pan=.5, g=.6)
pipe = lv('care', 1)['from'] / FPS + 10 / FPS
for i in range(5): put(pop(83 + i * 2), pipe + (10 + i * 25) / FPS, pan=.4, g=.6)
put(chime(80), pipe + 112 / FPS)
to = lv('engine', 1)['from'] / FPS
for i in range(3): put(pop(83 + i * 4), to + i * 8 / FPS, pan=.4, g=.7)
put(chime(76), wt('engine', 1, 'next check-up') + 4 / FPS, g=.8)
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
