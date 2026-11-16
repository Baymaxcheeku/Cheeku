import math

S = 15.0
C30 = math.cos(math.radians(30))
S30 = 0.5


def iso(x, y, z=0.0):
    return ((x - y) * C30 * S, (x + y) * S30 * S - z * S)


def poly(pts, cls):
    return '<polygon class="%s" points="%s"/>' % (cls, " ".join("%.1f,%.1f" % iso(*p) for p in pts))


def prism(x, y, w, d, h, z0=0.0, kind="o"):
    t = [(x, y, z0 + h), (x + w, y, z0 + h), (x + w, y + d, z0 + h), (x, y + d, z0 + h)]
    r = [(x + w, y, z0), (x + w, y + d, z0), (x + w, y + d, z0 + h), (x + w, y, z0 + h)]
    f = [(x, y + d, z0), (x + w, y + d, z0), (x + w, y + d, z0 + h), (x, y + d, z0 + h)]
    return [(x + y + z0 * 0.01, poly(r, kind + "-r") + poly(f, kind + "-l") + poly(t, kind + "-t"))]


# stations: id, x, y, number, title, sub
ST = [
    ("you", 0, 0, "1", "You, at home", "Types or speaks the symptom"),
    ("gate", 10, 0, "2", "Cheeku intake", "Safety gate, then questions"),
    ("doc", 20, 0, "3", "MBBS doctor", "Decides and signs"),
    ("rx", 30, 0, "4", "e-Prescription", "Filed to the health file"),
    ("ph", 30, 10, "5", "Partner pharmacy", "Pharmacist checks, then dispatch"),
    ("home", 20, 10, "6", "Medicine at the door", "Check-in at 24 to 48 h"),
    ("care", 10, 10, "C", "Care network", "Video consult, home visit, home test"),
    ("em", 10, 20, "!", "Emergency", "112 and ambulance"),
]
P = 4.0  # plate size


def objects(sid, x, y):
    out = []
    cx, cy = x, y
    if sid == "you":
        out += prism(cx + 1.6, cy + 1.2, 1.0, 0.35, 2.6, 0.4, "a")
        out += prism(cx + 1.75, cy + 1.25, 0.7, 0.05, 2.2, 0.6, "s")
    elif sid == "gate":
        out += prism(cx + 0.6, cy + 1.4, 0.5, 0.5, 2.4, 0.4, "n")
        out += prism(cx + 2.9, cy + 1.4, 0.5, 0.5, 2.4, 0.4, "n")
        out += prism(cx + 0.6, cy + 1.4, 2.8, 0.5, 0.4, 2.8, "a")
        out += prism(cx + 1.5, cy + 2.4, 1.0, 1.0, 0.7, 0.4, "a")
    elif sid == "doc":
        out += prism(cx + 0.7, cy + 1.6, 2.6, 1.4, 1.0, 0.4, "n")
        out += prism(cx + 1.3, cy + 1.7, 1.4, 0.15, 1.1, 1.4, "a")
        out += prism(cx + 1.6, cy + 3.1, 0.8, 0.6, 1.3, 0.4, "s")
    elif sid == "rx":
        for i in range(3):
            out += prism(cx + 1.0 + i * 0.15, cy + 0.8 + i * 0.15, 2.0, 2.6, 0.2, 0.4 + i * 0.22, "w")
        out += prism(cx + 1.6, cy + 1.5, 0.9, 0.9, 0.05, 1.08, "a")
    elif sid == "ph":
        out += prism(cx + 0.6, cy + 0.6, 2.8, 2.6, 1.8, 0.4, "w")
        out += prism(cx + 1.6, cy + 1.0, 0.8, 1.8, 0.08, 2.2, "a")
        out += prism(cx + 1.1, cy + 1.5, 1.8, 0.8, 0.08, 2.2, "a")
    elif sid == "home":
        out += prism(cx + 0.7, cy + 0.7, 2.6, 2.6, 1.6, 0.4, "w")
        out += prism(cx + 0.5, cy + 0.5, 3.0, 3.0, 0.35, 2.0, "n")
        out += prism(cx + 1.7, cy + 3.3, 0.6, 0.05, 0.9, 0.4, "a")
    elif sid == "care":
        out += prism(cx + 0.6, cy + 0.6, 2.8, 2.6, 1.4, 0.4, "c")
        out += prism(cx + 1.6, cy + 1.0, 0.8, 1.8, 0.08, 1.8, "w")
        out += prism(cx + 1.1, cy + 1.5, 1.8, 0.8, 0.08, 1.8, "w")
    elif sid == "em":
        out += prism(cx + 0.5, cy + 1.2, 3.0, 1.6, 1.4, 0.4, "e")
        out += prism(cx + 0.5, cy + 2.79, 3.0, 0.02, 0.3, 1.0, "w")
    return out


def build():
    items = []
    # ground paths (drawn first)
    paths = []

    def line(a, b, cls):
        (x1, y1), (x2, y2) = iso(*a), iso(*b)
        paths.append('<line class="%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (cls, x1, y1, x2, y2))

    pos = {s[0]: (s[1], s[2]) for s in ST}
    mid = lambda k: (pos[k][0] + P / 2, pos[k][1] + P / 2, 0.0)
    for a, b in [("you", "gate"), ("gate", "doc"), ("doc", "rx"), ("rx", "ph"), ("ph", "home")]:
        line(mid(a), mid(b), "path")
    line(mid("gate"), mid("care"), "path br")
    line(mid("care"), mid("em"), "path em")
    line(mid("home"), (pos["home"][0] - 6, pos["home"][1] + P / 2, 0), "path back")

    for sid, x, y, n, t, sub in ST:
        kind = "p" if sid not in ("care", "em") else ("pc" if sid == "care" else "pe")
        items += prism(x, y, P, P, 0.4, 0.0, kind)
        items += objects(sid, x, y)
    items.sort(key=lambda it: it[0])
    body = "".join(paths) + "".join(i[1] for i in items)

    labels = []
    for sid, x, y, n, t, sub in ST:
        bx, by = iso(x + P / 2, y + P / 2, 4.6)
        cls = "nb" + (" nb-c" if sid == "care" else (" nb-e" if sid == "em" else ""))
        labels.append('<line class="ld" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/><circle class="%s" cx="%.1f" cy="%.1f" r="13"/><text class="nbt" x="%.1f" y="%.1f">%s</text>' % (bx, by + 13, bx, iso(x + P / 2, y + P / 2, 3.2)[1], cls, bx, by, bx, by + 4.5, n))
    # bounds
    xs, ys = [], []
    for sid, x, y, *_ in ST:
        for p in [(x, y, 5.5), (x + P, y, 0), (x, y + P, 0), (x + P, y + P, 0)]:
            X, Y = iso(*p)
            xs.append(X)
            ys.append(Y)
    minx, maxx = min(xs) - 20, max(xs) + 20
    miny, maxy = min(ys) - 40, max(ys) + 16
    w, h = maxx - minx, maxy - miny
    tagsvg = ""
    return '<svg class="iso" viewBox="%.0f %.0f %.0f %.0f" role="img" aria-label="Isometric map of the Cheeku Doctor flow: you, Cheeku intake and safety gate, an MBBS doctor, the e-prescription, a partner pharmacy and delivery home, with side exits to the care network and to emergency care.">%s%s%s</svg>' % (minx, miny, w, h, body, tagsvg, "".join(labels))


if __name__ == "__main__":
    print(build())
