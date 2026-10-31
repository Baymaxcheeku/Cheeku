import json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = json.load(open('script.json'))
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
out = []
for sc in S['scenes']:
    for i, line in enumerate(sc['lines']):
        ph = k.tokenizer.phonemize(line, "en-us")
        for a, b in S['phonemeFixes'].items(): ph = ph.replace(a, b)
        a, sr = k.create(ph, voice=S['voice'], speed=S['speed'], is_phonemes=True)
        # trim silence at edges
        idx = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, idx[0]-int(.03*sr)): idx[-1]+int(.08*sr)]
        name = f"{sc['id']}_{i}.wav"; sf.write('public/vo/' + name, a, sr)
        out.append({'scene': sc['id'], 'i': i, 'file': name, 'dur': round(len(a)/sr, 3), 'text': line})
        print(f"{name:16} {len(a)/sr:5.2f}s  {line}")
json.dump(out, open('vo_lines.json', 'w'), indent=1)
print('total speech', round(sum(o['dur'] for o in out), 1))
