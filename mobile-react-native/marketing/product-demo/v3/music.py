# Original score for the Cheeku product demo v2. Additive synthesis + FFT reverb, numpy only.
import json, numpy as np, soundfile as sf
SR = 44100
T = json.load(open('src/timeline.json'))
TOTAL = T['total'] / T['fps']
N = int((TOTAL + 0.5) * SR)
sec = {s['id']: (s['from'] / 30, (s['from'] + s['dur']) / 30) for s in T['scenes']}
rng = np.random.default_rng(7)
mf = lambda m: 440.0 * 2 ** ((m - 69) / 12)

L = np.zeros(N); R = np.zeros(N)
def add(buf_l, buf_r, sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    buf_l[i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2)
    buf_r[i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2)

def env(n, a, d_total, rel=0.3):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    rel_n = int(rel * SR)
    if rel_n and n > rel_n: e[-rel_n:] *= np.linspace(1, 0, rel_n) ** 2
    return e

# ---------- instruments ----------
def pad_note(m, dur, bright=1.0):
    n = int((dur + 1.2) * SR); t = np.arange(n) / SR; f = mf(m); s = np.zeros(n)
    for h in range(1, 9):
        amp = (1 / h ** 1.6) * (bright if h > 2 else 1)
        for det in (-0.06, 0.0, 0.07):
            s += amp * np.sin(2 * np.pi * f * h * (1 + det / 100 * h) * t + rng.uniform(0, 6.28))
    e = np.minimum(1, t / 0.9) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.45))
    return s * e * 0.06

def pluck(m, dur=0.9, tone=1.0):
    n = int((dur + 0.6) * SR); t = np.arange(n) / SR; f = mf(m); s = np.zeros(n)
    for h, a in [(1, 1), (2, .45), (3, .22), (4, .12), (5, .06), (6, .03)]:
        s += a * np.sin(2 * np.pi * f * h * (1 + 0.0004 * h * h) * t) * np.exp(-t * (2.6 + h * 1.4 * tone))
    s *= np.minimum(1, t / 0.004)
    return s * 0.22

def bell(m, dur=2.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = mf(m)
    s = (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + .25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6))
    return s * np.exp(-t * 1.6) * np.minimum(1, t / 0.002) * 0.16

def bass(m, dur):
    n = int((dur + .2) * SR); t = np.arange(n) / SR; f = mf(m)
    s = np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) + .08 * np.sin(2 * np.pi * 3 * f * t)
    e = np.minimum(1, t / 0.02) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.06)) * (0.75 + 0.25 * np.exp(-t * 4))
    return s * e * 0.11

def kick(g=1.0):
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 46 + 95 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * 0.42 * g

def hp_noise(n, k=1):
    x = rng.standard_normal(n)
    for _ in range(k): x = np.diff(x, prepend=0)
    return x / (np.abs(x).max() + 1e-9)

def hat(g=1.0, open_=False):
    n = int((.22 if open_ else .06) * SR); t = np.arange(n) / SR
    return hp_noise(n, 2) * np.exp(-t * (14 if open_ else 70)) * 0.08 * g

def clap(g=1.0):
    n = int(.3 * SR); t = np.arange(n) / SR; x = hp_noise(n, 1)
    e = sum(np.exp(-np.maximum(0, t - o) * 60) * (t >= o) for o in (0, .011, .022)) + 0.5 * np.exp(-t * 18)
    return x * e * 0.09 * g

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR; x = hp_noise(n, 1)
    sw = np.sin(2 * np.pi * np.cumsum(300 + 2600 * (t / dur) ** 2) / SR) * 0.15
    return (x * 0.5 + sw) * (t / dur) ** 2.2 * 0.12

def impact():
    n = int(2.5 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 50 * t) * np.exp(-t * 3) * .5 + hp_noise(n, 1) * np.exp(-t * 9) * .15) * 0.5

# ---------- harmony plan ----------
D = {'D': [62, 66, 69, 74], 'A': [61, 64, 69, 73], 'Bm': [62, 66, 71, 74], 'G': [62, 67, 71, 74], 'F#m': [61, 66, 69, 73],
     'Asus': [62, 64, 69, 74], 'E': [64, 68, 71, 76], 'B': [63, 66, 71, 75], 'C#m': [64, 68, 73, 76], 'Aadd9': [64, 69, 71, 73],
     'Dadd9': [62, 64, 66, 69], 'Eadd9': [64, 66, 68, 71], 'Gmaj7': [62, 66, 67, 71]}
ROOT = {'D': 38, 'A': 33, 'Bm': 35, 'G': 31, 'F#m': 30, 'Asus': 33, 'E': 40, 'B': 35, 'C#m': 37, 'Aadd9': 33, 'Dadd9': 38, 'Eadd9': 40, 'Gmaj7': 31}
BAR = 2.4
def progression(t0, t1, chords, bars_each=1):
    out = []; t = t0; i = 0
    while t < t1 - 0.05:
        d = min(BAR * bars_each, t1 - t); out.append((t, d, chords[i % len(chords)])); t += d; i += 1
    return out

plan = []
plan += progression(0, sec['hook'][1], ['Bm', 'Gmaj7'], 2)
plan += progression(sec['meet'][0], sec['labs'][1], ['D', 'A', 'Bm', 'G'])
plan += progression(sec['preg'][0], sec['preg'][1], ['G', 'Asus'])
plan += progression(sec['gyne'][0], sec['medcheck'][1], ['D', 'F#m', 'G', 'A'])
plan += progression(sec['baby'][0], sec['baby'][1], ['E', 'B', 'C#m', 'A'])
plan += progression(sec['fever'][0], sec['fever'][1], ['C#m', 'Aadd9'], 2)
plan += progression(sec['after'][0], sec['engine'][1], ['E', 'B', 'C#m', 'A'])
c0 = sec['close'][0]
plan += [(c0, 1.2, 'A'), (c0 + 1.2, 1.2, 'B'), (c0 + 2.4, TOTAL - c0 - 2.4, 'Eadd9')]

def in_(sid, t): a, b = sec[sid]; return a <= t < b
def section(t):
    for s in T['scenes']:
        if s['from'] / 30 <= t < (s['from'] + s['dur']) / 30: return s['id']
    return 'close'

PL, PR = np.zeros(N), np.zeros(N)   # pad bus (gets pumped by kick)
for (t, d, c) in plan:
    sid = section(t + 0.01)
    bright = 0.35 if sid in ('hook', 'fever') else 1.0
    for j, m in enumerate(D[c]): add(PL, PR, pad_note(m, d, bright), t, pan=(-0.5 + j / 3), gain=(0.9 if sid != 'hook' else 0.7) * (0.6 if j == 0 else 1))
    # bass from 'family' on, softer in fever
    if t >= sec['plan'][0] - 0.01:
        g = 0.55 if sid == 'fever' else 1.0
        if sid == 'fever':
            add(L, R, bass(ROOT[c], d), t, gain=g)
        else:
            for k in range(int(round(d / (BAR / 2)))): add(L, R, bass(ROOT[c], BAR / 2 - 0.05), t + k * BAR / 2, gain=g * (1 if k % 2 == 0 else .8))
    # arpeggio
    if t >= sec['meet'][0] - 0.01 and sid not in ('hook',):
        step = 0.15 if sid in ('engine',) else 0.3
        notes = D[c] + [D[c][1] + 12, D[c][2] + 12]
        pat = [0, 2, 3, 4, 1, 3, 5, 2] if sid != 'fever' else [0, 2, 1, 3]
        k = 0; tt = t
        while tt < t + d - 0.02:
            m = notes[pat[k % len(pat)]]
            g = 0.55 if sid == 'fever' else (0.8 if sid in ('meet', 'plan') else 1.0)
            if sid == 'fever' and k % 2: k += 1; tt += step; continue
            add(L, R, pluck(m + 12, tone=1.2 if step < .2 else 1.0), tt, pan=0.35 * np.sin(k * 1.3), gain=g * (0.75 if k % 2 else 1))
            k += 1; tt += step

# hook: ticking + notification blips (in key)
for i in range(int(sec['hook'][1] / 0.3)):
    add(L, R, hat(0.6), i * 0.3, pan=0.2)
for t0, m in [(1.4, 78), (2.3, 81), (3.1, 76), (4.0, 83), (4.6, 78), (5.4, 81), (6.1, 74)]:
    add(L, R, bell(m, 0.7), t0, pan=rng.uniform(-.7, .7), gain=0.55)

# drums
def drums(t0, t1, full=False, g=1.0):
    t = t0; b = 0
    while t < t1 - 0.05:
        for q in range(4):
            tq = t + q * BAR / 4
            if tq >= t1: break
            if q in (0, 2) or (full and q == 3 and b % 2): add(L, R, kick(g), tq); duck(tq)
            if q in (1, 3): add(L, R, clap(g * (1 if full else .55)), tq, pan=0.05)
            for e in range(2):
                add(L, R, hat(g * (1 if e else .55)), tq + e * BAR / 8, pan=-0.25)
        t += BAR; b += 1
pump = np.ones(N)
def duck(t0):
    i = int(t0 * SR); n = int(0.32 * SR); seg = 1 - 0.35 * np.exp(-np.arange(n) / SR * 9)
    pump[i:i + n] = np.minimum(pump[i:i + n], seg[: max(0, min(n, N - i))])

drums(sec['plan'][0], sec['labs'][1], False, 0.7)
drums(sec['gyne'][0], sec['medcheck'][1], False, 0.85)
drums(sec['baby'][0], sec['baby'][1], True, 0.9)
drums(sec['after'][0], sec['after'][1], True, 0.85)
# fever: heartbeat
t = sec['fever'][0] + 0.3
while t < sec['fever'][1] - 0.6:
    add(L, R, kick(0.55), t); add(L, R, kick(0.35), t + 0.28); t += 1.15
drums(sec['care'][0], sec['fit'][1], True, 1.0)
drums(sec['engine'][0], sec['engine'][1], True, 1.05)
# close: one big hit then air
add(L, R, kick(1.1), c0 + 2.4); add(L, R, impact(), c0 + 2.4, gain=0.8)

# motifs and lifts
def motif(t0, notes, step=0.3, gain=1.0):
    for i, m in enumerate(notes): add(L, R, bell(m), t0 + i * step, pan=0.3 * (-1) ** i, gain=gain)
motif(sec['meet'][0] + 0.15, [74, 78, 81, 86], 0.18, 0.8)
motif(sec['preg'][0] + 0.1, [78, 81, 83, 86, 90], 0.22, 0.9)
motif(sec['baby'][0] + 0.1, [76, 80, 83, 88, 92], 0.22, 1.0)
motif(sec['care'][0] + 0.05, [80, 83, 88], 0.2, 0.7)
motif(c0 + 2.4, [76, 80, 83, 88, 92, 95], 0.16, 0.9)
for sid, lead in [('meet', 1.6), ('preg', 1.4), ('baby', 1.8), ('care', 1.6), ('engine', 1.2), ('close', 2.4)]:
    t1 = sec[sid][0] + (2.4 if sid == 'close' else 0)
    add(L, R, riser(lead), t1 - lead, gain=0.8)
    if sid != 'close': add(L, R, impact(), t1, gain=0.35)

# mix pad bus with pump
L += PL * pump; R += PR * pump

# reverb: synthetic stereo IR, FFT convolution
def reverb(x, seed):
    r = np.random.default_rng(seed); n = int(2.6 * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 2.4); ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = 1 << int(np.ceil(np.log2(len(x) + n)))
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
L = L * 0.82 + reverb(L, 1) * 0.32; R = R * 0.82 + reverb(R, 2) * 0.32

# master fades
fade_in = int(0.8 * SR); L[:fade_in] *= np.linspace(0, 1, fade_in); R[:fade_in] *= np.linspace(0, 1, fade_in)
fo = int(3.5 * SR); L[-fo:] *= np.linspace(1, 0, fo) ** 1.5; R[-fo:] *= np.linspace(1, 0, fo) ** 1.5
mx = np.stack([L, R], 1); mx /= np.abs(mx).max() / 0.89
sf.write('music.wav', mx.astype(np.float32), SR)
print('music', round(len(mx) / SR, 1), 's')
