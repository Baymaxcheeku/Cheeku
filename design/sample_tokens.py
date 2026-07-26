"""Sample colours from the design frames so tokens are measured, not guessed.

The frames are iPhone mockups: black bezel around a ~390x844-proportioned screen.
Near-neutral pixels dominate, so brand/semantic tokens are found by filtering on
saturation and clustering what remains.
"""

import colorsys
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

SCREENS = Path(__file__).parent / "screens"


def hexof(rgb):
    return "#{:02X}{:02X}{:02X}".format(*rgb[:3])


def hsv(rgb):
    r, g, b = (c / 255 for c in rgb)
    return colorsys.rgb_to_hsv(r, g, b)


def screen_crop(img):
    """Trim the black device bezel, returning the live UI area."""
    w, h = img.size
    px = img.load()
    mid_y = h // 2
    left = 0
    while left < w // 3 and sum(px[left, mid_y]) < 60:
        left += 1
    right = w - 1
    while right > 2 * w // 3 and sum(px[right, mid_y]) < 60:
        right -= 1
    mid_x = (left + right) // 2
    top = 0
    while top < h // 3 and sum(px[mid_x, top]) < 60:
        top += 1
    bottom = h - 1
    while bottom > 2 * h // 3 and sum(px[mid_x, bottom]) < 60:
        bottom -= 1
    return img.crop((left, top, right + 1, bottom + 1))


def quantize(rgb, step=8):
    return tuple(min(255, (c // step) * step + step // 2) for c in rgb)


def report(path, min_sat=0.15, min_val=0.10, top=18):
    img = Image.open(path).convert("RGB")
    ui = screen_crop(img)
    counts = Counter()
    for rgb in ui.getdata():
        h, s, v = hsv(rgb)
        if s >= min_sat and v >= min_val:
            counts[quantize(rgb)] += 1
    total = max(1, sum(counts.values()))
    print(f"\n=== {path.name}  (ui {ui.size[0]}x{ui.size[1]}) ===")
    for rgb, n in counts.most_common(top):
        h, s, v = hsv(rgb)
        print(f"  {hexof(rgb)}  {n / total * 100:5.2f}%  hue={h * 360:5.1f} sat={s:.2f} val={v:.2f}")


if __name__ == "__main__":
    for name in sys.argv[1:]:
        report(SCREENS / name)


def aggregate(paths, min_sat=0.12, min_val=0.10, top=40):
    counts = Counter()
    for p in paths:
        img = Image.open(p).convert("RGB")
        ui = screen_crop(img)
        ui = ui.resize((ui.size[0] // 2, ui.size[1] // 2))
        for rgb in ui.getdata():
            h, s, v = hsv(rgb)
            if s >= min_sat and v >= min_val:
                counts[quantize(rgb, 12)] += 1
    total = max(1, sum(counts.values()))
    print(f"\n=== AGGREGATE over {len(paths)} frames ===")
    for rgb, n in counts.most_common(top):
        h, s, v = hsv(rgb)
        print(f"  {hexof(rgb)}  {n/total*100:5.2f}%  hue={h*360:5.1f} sat={s:.2f} val={v:.2f}")
