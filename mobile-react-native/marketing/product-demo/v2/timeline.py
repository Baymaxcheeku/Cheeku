import json
FPS = 30
L = json.load(open('vo_lines.json'))
MIN = dict(hook=8.4, meet=7.0, family=5.6, plan=16.0, positive=4.0, pregnancy=10.0, doctor=6.6, baby=8.6, homecare=6.8, fever=9.2, care=14.5, engine=11.5, close=10.5)
LEAD = dict(hook=1.2, meet=0.9, positive=0.6, close=0.8)
order = list(MIN)
t = 0; scenes = []
for sid in order:
    lines = [l for l in L if l['scene'] == sid]
    lead = LEAD.get(sid, 0.5); gap = 0.45
    need = lead + sum(l['dur'] for l in lines) + gap * (len(lines) - 1) + 0.9
    dur = max(MIN[sid], need)
    # spread lines: if room, widen gaps evenly
    extra = dur - need; g = gap + (extra / max(1, len(lines)) * 0.5 if len(lines) > 1 else 0)
    cur = t + lead; vo = []
    for l in lines:
        vo.append({'file': l['file'], 'from': round(cur * FPS), 'dur': round(l['dur'] * FPS), 'text': l['text']}); cur += l['dur'] + g
    scenes.append({'id': sid, 'from': round(t * FPS), 'dur': round(dur * FPS), 'vo': vo}); t += dur
json.dump({'fps': FPS, 'total': round(t * FPS), 'scenes': scenes}, open('src/timeline.json', 'w'), indent=1)
for s in scenes: print(f"{s['id']:10} {s['from']/FPS:6.1f}s  {s['dur']/FPS:5.1f}s")
print('TOTAL', round(t, 1), 's')
