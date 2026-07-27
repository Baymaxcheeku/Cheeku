"""Extract the illustrations out of the mockup frames into public/illustrations/.

The frames are iPhone renders sitting on a light page, with a black phone body
around a lit screen. The first pass cropped by fractions of the *whole* PNG,
which baked slivers of that black body into several illustrations. Crops here
are fractions of the lit screen instead, so the bezel cannot leak in.

    .designvenv/bin/python design/crop_illustrations.py
"""

from pathlib import Path

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


def crop(frame: str, out: str, l: float, t: float, r: float, b: float) -> None:
    """Crop by fractions of the lit screen — (0,0) top-left, (1,1) bottom-right."""
    image = Image.open(FRAMES / frame)
    assert image.size == FRAME_SIZE, f"{frame} is {image.size}, not the {FRAME_SIZE} mockup"
    x0, y0, x1, y1 = SCREEN
    w, h = x1 - x0, y1 - y0
    box = (round(x0 + w * l), round(y0 + h * t), round(x0 + w * r), round(y0 + h * b))
    image.crop(box).save(OUT / out)
    print(f"{out:24} {box}")


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
    # Top edge starts below the card's own close button, which sits in the same
    # corner and would otherwise be baked into the artwork.
    ("C Home screen 1.png", "home-reminder.png", 0.50, 0.352, 0.94, 0.505),
    # Bottom stops above the card's own input field and send button.
    ("C Home screen 1.png", "home-ask.png", 0.615, 0.722, 0.945, 0.826),
]

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for args in CROPS:
        crop(*args)
