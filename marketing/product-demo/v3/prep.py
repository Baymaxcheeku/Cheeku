# Copy the recorded clips into public/clips, merge their tap logs, and sample the
# colour at the top and bottom edge of each clip over time (for the status bar strip).
import json, os, subprocess, glob, shutil
CAP = 'capture/cap/out'
os.makedirs('public/clips', exist_ok=True)
EV, COL = {}, {}
for d in sorted(glob.glob(CAP + '/c[0-9][0-9]-*')):
    name = os.path.basename(d); src = d + '/clip.mp4'
    if not os.path.exists(src) or not os.path.exists(d + '/events.json'): continue
    shutil.copy(src, f'public/clips/{name}.mp4')
    EV[name] = json.load(open(d + '/events.json'))
    def strip(crop):
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-vf', f'fps=4,{crop},scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        return [list(raw[i:i + 3]) for i in range(0, len(raw) - 2, 3)]
    top = strip('crop=iw:6:0:0'); bot = strip('crop=iw:6:0:ih-6')
    COL[name] = [{'t': round(i / 4, 2), 'top': top[i], 'bot': bot[min(i, len(bot) - 1)]} for i in range(len(top))]
    print(name, EV[name]['duration'], len(top))
json.dump(EV, open('src/events.json', 'w'))
json.dump(COL, open('src/colors.json', 'w'))
