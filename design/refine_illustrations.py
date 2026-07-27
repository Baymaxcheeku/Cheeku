"""Post-process the cropped illustrations. Run after crop_illustrations.py:

    .designvenv/bin/python design/crop_illustrations.py
    .designvenv/bin/python design/refine_illustrations.py

WHAT THIS DOES NOT DO: key out the background.

That was the obvious fix and it does not work here. The frames' backdrop is
(246,244,252) and Baymax's own body is (252,251,253) — eight levels apart. Any
tolerance loose enough to clear the backdrop also erases the character, which
is exactly what happened on the first attempt: auth-hero came back with 7% of
its pixels left. There is no colour key that separates a white robot from a
near-white page.

So the rectangle is dissolved in CSS instead, with a soft alpha mask at the
element's edges (`illus-soft` in globals.css). That is background-agnostic — it
works the same on a white card and on the brand gradient — and it cannot eat
the subject, because it only ever touches the outer few percent of the box.

WHAT IT DOES:

- TRIMS uniform margin. Only rows and columns that are entirely one colour are
  removed, so this cannot bite into artwork. Without it a `h-[96px]` is partly
  sizing empty space and the subject renders smaller than intended, which reads
  as low resolution even when it is not.

- SHARPENS. The frames are a 853x1844 render and the 3D art in them is soft to
  begin with; the browser then downsamples it again. A mild unsharp mask puts
  the edge definition back. Radius stays small so it defines contours rather
  than amplifying the render's noise into visible grain.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "illustrations"

# A row counts as margin only if every pixel in it is within this of the first.
# Tight, because the point is to remove flat padding, not to crop artwork.
FLAT = 3


def _flat_run(pixels, length: int, at, first) -> bool:
    for i in range(length):
        c = pixels[at(i)]
        if abs(c[0] - first[0]) > FLAT or abs(c[1] - first[1]) > FLAT or abs(c[2] - first[2]) > FLAT:
            return False
    return True


def trim_flat_margin(image: Image.Image) -> Image.Image:
    """Drop border rows/columns that are a single flat colour."""
    rgb = image.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    top, bottom, left, right = 0, h - 1, 0, w - 1

    while top < bottom and _flat_run(px, w, lambda i, y=top: (i, y), px[0, top]):
        top += 1
    while bottom > top and _flat_run(px, w, lambda i, y=bottom: (i, y), px[0, bottom]):
        bottom -= 1
    while left < right and _flat_run(px, h, lambda i, x=left: (x, i), px[left, 0]):
        left += 1
    while right > left and _flat_run(px, h, lambda i, x=right: (x, i), px[right, 0]):
        right -= 1

    return rgb.crop((left, top, right + 1, bottom + 1))


def sharpen(image: Image.Image) -> Image.Image:
    return image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=72, threshold=3))


if __name__ == "__main__":
    for path in sorted(OUT.glob("*.png")):
        original = Image.open(path)
        before = original.size
        result = sharpen(trim_flat_margin(original))
        result.save(path, optimize=True)
        print(f"{path.name:22} {before[0]}x{before[1]} -> {result.size[0]}x{result.size[1]}")
