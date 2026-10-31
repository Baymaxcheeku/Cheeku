"""Extract the illustrations out of the mockup frames into public/illustrations/.

The frames are iPhone renders sitting on a light page, with a black phone body
around a lit screen. The first pass cropped by fractions of the *whole* PNG,
which baked slivers of that black body into several illustrations. Crops here
are fractions of the lit screen instead, so the bezel cannot leak in.

    .designvenv/bin/python design/crop_illustrations.py
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES = ROOT / "design" / "screens"
OUT = ROOT / "public" / "illustrations"

FRAME_SIZE = (853, 1844)

# The lit screen inside the phone body, as (left, top, right, bottom).
#
# Auto-detecting this per frame is unreliable: several illustrations run light
# right to the PNG edge, so an edge scan finds the page background, and dark
# artwork splits a centre-row scan. Every one of the 42 frames is the same
# mockup at the same size, so this is measured once — it is the modal run of
# non-black pixels across all of them — and asserted rather than re-derived.
SCREEN = (31, 23, 823, 1822)


def crop(
    frame: str,
    out: str,
    l: float,
    t: float,
    r: float,
    b: float,
    patch: Optional[Tuple[int, int, int, int]] = None,
) -> None:
    """Crop by fractions of the lit screen — (0,0) top-left, (1,1) bottom-right.

    `patch` is a box in the CROPPED image's own pixels that gets painted over by
    smearing the pixel immediately to its left across each row.

    It exists for the Home reminder card, whose close button is drawn over the
    artwork's corner. No rectangular crop can drop the button without also
    cutting the calendar in half. The button sits on the card's plain
    background rather than on the blob, so copying the neighbouring pixel
    leftwards reproduces that background exactly — including any gradient —
    without needing to know what colour it is.
    """
    image = Image.open(FRAMES / frame)
    assert image.size == FRAME_SIZE, f"{frame} is {image.size}, not the {FRAME_SIZE} mockup"
    x0, y0, x1, y1 = SCREEN
    w, h = x1 - x0, y1 - y0
    box = (round(x0 + w * l), round(y0 + h * t), round(x0 + w * r), round(y0 + h * b))
    cropped = image.crop(box).convert("RGB")

    if patch:
        px = cropped.load()
        pl, pt, pr, pb = patch
        # Clamped, so a patch box written to run to the edge cannot overrun it.
        pr, pb = min(pr, cropped.width), min(pb, cropped.height)
        for yy in range(pt, pb):
            source = px[max(pl - 1, 0), yy]
            for xx in range(pl, pr):
                px[xx, yy] = source

    cropped.save(OUT / out)
    print(f"{out:24} {box}{'  patched' if patch else ''}")


CROPS = [
    ("A Flash screen 1.png", "carousel-1.png", 0.00, 0.345, 1.00, 0.79),
    ("A Flash screen 3.png", "carousel-2.png", 0.00, 0.33, 1.00, 0.68),
    ("A Flash screen 2.png", "carousel-3.png", 0.04, 0.328, 0.96, 0.51),
    ("A Flash screen 4.png", "carousel-4.png", 0.04, 0.28, 0.96, 0.53),
    ("B onboarding flow screen 1 authentication.png", "auth-hero.png", 0.55, 0.105, 0.985, 0.225),
    ("B onboarding flow screen usage selection 2.png", "who-me.png", 0.04, 0.335, 0.30, 0.475),
    ("B onboarding flow screen usage selection 2.png", "who-family.png", 0.03, 0.540, 0.33, 0.690),
    ("B onboarding flow screen profile creation 3.png", "profile-hero.png", 0.62, 0.108, 0.985, 0.222),
    ("B onboarding flow screen upload first document hook 4.png", "upload-hero.png", 0.58, 0.108, 0.985, 0.252),
    # Home (B1): the reminder card's bell-and-calendar, and the Baymax bust that
    # sits inside the Ask Baymax panel.
    #
    # The blob's own bounds are x 0.4015-0.9419, y 0.3235-0.4958 of the screen,
    # measured by scanning for lavender rather than guessed. Cropping below the
    # close button (as a first attempt did) sliced the top off the bell, so the
    # full blob is taken and the button is painted out — see `patch`.
    (
        "C Home screen 1.png",
        "home-reminder.png",
        # Left edge clears the headline: the blob's leftmost point is at 0.4015
        # but its upper lobe overhangs the end of "thyroid checkup", so cropping
        # to the blob's own bounds drags the last letters in with it.
        0.447,
        0.320,
        0.945,
        0.497,
        (320, 0, 400, 48),  # the close button, in cropped pixels
    ),
    # Bottom stops above the card's own input field and send button.
    ("C Home screen 1.png", "home-ask.png", 0.615, 0.722, 0.945, 0.826),
]

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for args in CROPS:
        crop(*args)
