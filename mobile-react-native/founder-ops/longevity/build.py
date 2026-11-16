# Builds longevity-engine.html: the build document for the longevity engine (AI and app layers).
# Design and isometric helpers come from the Cheeku Doctor playbook.
import re, sys, pathlib
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here.parent / 'cheeku-doctor'))
import iso as ISO

def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

# ---------------------------------------------------------------- system map --
ST = [  # id, x, y, n, title, sub, kind of tower
    ('in', 0, 0, '1', 'Everything the family shares', 'Reports, Rx, chat, voice, watch, logs'),
    ('read', 10, 0, '2', 'Read', 'OCR, extraction, units, checks'),
    ('mem', 20, 0, '3', 'Family memory', 'Series, ledger, loops, facts, clock'),
    ('rules', 30, 0, '4', 'Rules', 'Signed cut-offs, keyed on the clock'),
    ('areas', 30, 10, '5', 'Six areas', 'On track, watch or act'),
    ('plan', 20, 10, '6', 'Daily plan', 'Goals, 2 to 4 tasks a day'),
    ('talk', 10, 10, '7', 'Nudge and chat', 'The model explains, in their words'),
    ('act', 0, 10, '8', 'Act', 'Retest, doctor, care booked'),
]
def objects(sid, x, y):
    P = ISO.prism; o = []
    if sid == 'in':
        for i in range(3): o += P(x + 0.8 + i * 0.15, y + 0.9 + i * 0.15, 2.2, 2.6, 0.18, 0.4 + i * 0.2, 'w')
        o += P(x + 2.8, y + 2.6, 0.7, 0.4, 1.3, 0.4, 'a')
    elif sid == 'read':
        o += P(x + 0.7, y + 1.0, 2.6, 2.0, 1.0, 0.4, 'n'); o += P(x + 1.1, y + 1.3, 1.8, 1.4, 0.06, 1.4, 'w')
    elif sid == 'mem':
        for i, k in enumerate(['n', 'a', 'a', 's']): o += P(x + 0.8, y + 0.8, 2.4, 2.4, 0.5, 0.4 + i * 0.62, k)
    elif sid == 'rules':
        o += P(x + 0.8, y + 0.9, 0.5, 0.5, 2.6, 0.4, 'n'); o += P(x + 2.6, y + 0.9, 0.5, 0.5, 2.6, 0.4, 'n'); o += P(x + 0.8, y + 0.9, 2.3, 0.5, 0.4, 3.0, 'a')
    elif sid == 'areas':
        for i, (h, k) in enumerate([(1.0, 'a'), (1.8, 'a'), (0.6, 'c'), (1.4, 'a'), (2.2, 'n'), (0.9, 'c')]):
            o += P(x + 0.6 + (i % 3) * 1.0, y + 0.8 + (i // 3) * 1.4, 0.7, 0.7, h, 0.4, k)
    elif sid == 'plan':
        o += P(x + 0.7, y + 0.7, 2.6, 2.6, 0.3, 0.4, 'w')
        for i in range(3): o += P(x + 1.0, y + 1.0 + i * 0.75, 2.0, 0.4, 0.12, 0.7, 'a' if i == 0 else 's')
    elif sid == 'talk':
        o += P(x + 0.9, y + 1.2, 1.0, 0.35, 2.4, 0.4, 'a'); o += P(x + 1.05, y + 1.25, 0.7, 0.05, 2.0, 0.6, 's')
        o += P(x + 2.3, y + 1.6, 1.2, 1.2, 0.8, 1.6, 'w')
    elif sid == 'act':
        o += P(x + 0.7, y + 0.7, 2.6, 2.6, 1.4, 0.4, 'c'); o += P(x + 1.6, y + 1.0, 0.8, 1.8, 0.08, 1.8, 'w'); o += P(x + 1.1, y + 1.5, 1.8, 0.8, 0.08, 1.8, 'w')
    return o

def system_map():
    items, paths, labels = [], [], []
    def line(a, b, cls):
        (x1, y1), (x2, y2) = ISO.iso(*a), ISO.iso(*b)
        paths.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="path %s"/>' % (x1, y1, x2, y2, cls))
    c = lambda x, y: (x + 2, y + 2, 0)
    for a, b in [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7)]:
        line(c(ST[a][1], ST[a][2]), c(ST[b][1], ST[b][2]), '')
    line(c(0, 10), c(0, 0), 'back')
    for sid, x, y, n, t, sub in ST:
        items += ISO.prism(x, y, 4, 4, 0.4, 0, 'p')
        items += objects(sid, x, y)
        bx, by = ISO.iso(x + 4.4, y + 4.4, 0)
        labels.append('<circle cx="%.1f" cy="%.1f" r="12" class="nb"/><text x="%.1f" y="%.1f" class="nbt">%s</text>' % (bx, by + 8, bx, by + 12.5, n))
    items.sort(key=lambda z: z[0])
    tx, ty = ISO.iso(0, 5, 0)
    labels.append('<text x="%.1f" y="%.1f" class="tg" text-anchor="end">the retest result comes back in</text>' % (tx - 14, ty))
    body = ''.join(paths) + ''.join(z[1] for z in items) + ''.join(labels)
    return '<svg class="iso" viewBox="-330 -20 730 420" role="img" aria-label="The longevity engine as eight stations in a loop: inputs, read, family memory, rules, six areas, daily plan, nudge and chat, act; the retest result comes back in as a new input">' + body + '</svg>'

def legend():
    return '<div class="legend">' + ''.join('<div><i>%s</i><p><b>%s</b><span>%s</span></p></div>' % (n, t, s) for _, _, _, n, t, s in ST) + '</div>'

# ------------------------------------------------------------- memory stack --
LAYERS = [
    ('Area history', 'One snapshot a day when a mark changes. Powers "what changed" and the weekly review.', 'n', 'new'),
    ('Six areas', 'Each area takes its worst fresh signal: on track, watch or act.', 'a', 'built'),
    ('Series, ledger, loops', 'Every number with previous, delta and rate. Medicines by ingredient. Tests still open.', 'a', 'built'),
    ('Facts and records', 'Reports, prescriptions, chat facts, watch days, logs. Corrections supersede, never erase.', 's', 'built'),
    ('Clock', 'Age, stage, pregnancy week or day of life. Thresholds depend on it.', 'w', 'built'),
    ('Subject graph', 'The family: who is who, and the one field read across (blood group).', 'w', 'built'),
]
def memory_stack():
    items, labels = [], []
    n = len(LAYERS)
    for i, (t, s, kind, state) in enumerate(reversed(LAYERS)):
        z = i * 2.3
        items += ISO.prism(0, 0, 7, 7, 0.6, z, kind)
        lx, ly = ISO.iso(7, 0, z + 0.4)
        ex = 150
        labels.append('<line x1="%.1f" y1="%.1f" x2="%d" y2="%.1f" class="ld"/>' % (lx + 4, ly, ex, ly))
        labels.append('<text x="%d" y="%.1f" class="lt">%s</text>' % (ex + 8, ly - 2, esc(t)))
        labels.append('<text x="%d" y="%.1f" class="ls">%s</text>' % (ex + 8, ly + 13, 'Built in the app' if state == 'built' else 'New, to build'))
    items.sort(key=lambda z: z[0])
    return '<svg class="iso stack" viewBox="-120 -230 500 360" role="img" aria-label="The longitudinal memory as six layers, from the subject graph at the bottom to area history at the top">' + ''.join(z[1] for z in items) + ''.join(labels) + '</svg>'


# ------------------------------------------------------- three doors in --
def doors_iso():
    P = ISO.prism; items, labels, paths = [], [], []
    # the person, centre
    cx, cy = 13, 7
    items += P(cx - 1, cy - 1, 6, 6, 0.4, 0, 'p')
    items += P(cx + 0.9, cy + 0.9, 2.2, 2.2, 3.4, 0.4, 'a')       # body
    items += P(cx + 1.3, cy + 1.3, 1.4, 1.4, 1.2, 3.8, 'n')       # head
    # doors: eaten (plate), taken (bottle), applied (tube)
    D = [(0, 0, 'Eaten', 'Food snaps', 'w'), (0, 8, 'Taken', 'Medicines, supplements, drinks', 'a'), (0, 16, 'Applied', 'Creams, oils, skincare', 'c')]
    for x, y, t, sub, k in D:
        items += P(x, y, 4, 4, 0.4, 0, 'p')
        if t == 'Eaten':
            items += P(x + 0.6, y + 0.6, 2.8, 2.8, 0.2, 0.4, 'w')
            items += P(x + 1.0, y + 1.0, 1.0, 1.0, 0.35, 0.6, 'c'); items += P(x + 2.1, y + 1.2, 0.9, 0.8, 0.3, 0.6, 'a'); items += P(x + 1.3, y + 2.2, 1.4, 0.8, 0.25, 0.6, 's')
        elif t == 'Taken':
            items += P(x + 1.3, y + 1.3, 1.4, 1.4, 1.8, 0.4, 'a'); items += P(x + 1.4, y + 1.4, 1.2, 1.2, 0.4, 2.2, 'n')
            items += P(x + 2.9, y + 2.3, 0.5, 0.5, 0.25, 0.4, 'w')
        else:
            items += P(x + 1.0, y + 1.5, 2.2, 0.9, 0.7, 0.4, 'c'); items += P(x + 3.2, y + 1.7, 0.5, 0.5, 0.5, 0.5, 'n')
        (x1, y1), (x2, y2) = ISO.iso(x + 4, y + 2, 0), ISO.iso(cx - 1, cy + 2, 0)
        paths.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="path"/>' % (x1, y1, x2, y2))
        tx, ty = ISO.iso(x + 2, y + 2, 2.6)
        labels.append('<text x="%.1f" y="%.1f" class="lt" text-anchor="middle">%s</text><text x="%.1f" y="%.1f" class="ls" text-anchor="middle">%s</text>' % (tx, ty - 22, t, tx, ty - 8, sub))
    # outputs: understand, act
    O = [(25, -1, 'Understand', 'What it means for you', 'n'), (25, 7, 'Practise', 'One habit, today', 'a'), (25, 15, 'Act', 'Care, fitness, a test', 'c')]
    for x, y, t, sub, k in O:
        items += P(x, y, 4, 4, 0.4, 0, 'p'); items += P(x + 0.8, y + 0.8, 2.4, 2.4, 1.2 if t != 'Act' else 1.6, 0.4, k)
        (x1, y1), (x2, y2) = ISO.iso(cx + 5, cy + 2, 0), ISO.iso(x, y + 2, 0)
        paths.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="path back"/>' % (x1, y1, x2, y2))
        tx, ty = ISO.iso(x + 2, y + 2, 2.4)
        labels.append('<text x="%.1f" y="%.1f" class="lt" text-anchor="middle">%s</text><text x="%.1f" y="%.1f" class="ls" text-anchor="middle">%s</text>' % (tx, ty - 22, t, tx, ty - 8, sub))
    tx, ty = ISO.iso(cx + 2, cy + 2, 5.4)
    labels.append('<text x="%.1f" y="%.1f" class="lt" text-anchor="middle">This person</text><text x="%.1f" y="%.1f" class="ls" text-anchor="middle">clock, areas, medicines, goals</text>' % (tx, ty - 22, tx, ty - 8))
    items.sort(key=lambda z: z[0])
    return '<svg class="iso doors" viewBox="-260 -90 620 470" role="img" aria-label="Three ways things enter the body, eaten, taken and applied, read against this person, then turned into understanding, a habit and an action">' + ''.join(paths) + ''.join(z[1] for z in items) + ''.join(labels) + '</svg>'

def lens(kind, title, sub, steps, reads, never):
    st = ''.join('<li>%s</li>' % x for x in steps)
    rd = ''.join('<li>%s</li>' % x for x in reads)
    return '<div class="lens %s"><span class="lv">%s</span><h3>%s</h3><ol>%s</ol><div class="rd"><b>Reads it against</b><ul>%s</ul></div><p class="nv"><b>Never:</b> %s</p></div>' % (kind, sub, title, st, rd, never)

LENSES = ''.join([
    lens('l1', 'Eaten', 'Food snaps', [
        'Snap the plate, or pick it from the diary. Breakfast, lunch, dinner, chai.',
        'The model names the Indian dishes and suggests tags: roti, dal, rice, fried, sweet, packaged. The person confirms with one tap.',
        'Portion in hands and katoris, never grams or calories.',
        'One line on the plate and at most two tips tied to their own numbers.',
        'Patterns over a week: "rice at dinner 5 of 7 nights", "no protein at breakfast".'],
        ['Sugar, weight, BP, LDL, liver, kidney, iron marks', 'Pregnancy week and trimester', 'Diabetes or thyroid medicines, timing', 'The goal they picked'],
        'calorie counts, "bad food", diets, fasting advice for pregnancy, children or diabetes on medicines.'),
    lens('l2', 'Taken', 'Medicines, supplements, drinks', [
        'Snap the strip, bottle, sachet or label, or let the Rx fill it in.',
        'Read the ingredients and the licence: drug, FSSAI food supplement or cosmetic.',
        'Add to the ledger by ingredient, with dose and how often.',
        'Check stacking, upper limits for age, clashes with prescribed medicines, pregnancy and breastfeeding.',
        'Say it plainly, with what to ask the doctor or pharmacist.'],
        ['Every active medicine, by ingredient', 'Age, kidney and liver values', 'Pregnancy, breastfeeding', 'Allergies on file'],
        'telling anyone to start, stop or change a prescribed medicine; rating a doctor.'),
    lens('l3', 'Applied', 'Creams, oils, skincare, hair', [
        'Snap the tube, jar or bottle; the label and ingredient list are read.',
        'Flag ingredients that matter for this person: steroids, retinoids, high salicylic acid, hydroquinone, mercury, strong fragrance.',
        'Check where and on whom: a baby\'s nappy area, broken skin, the face, pregnancy.',
        'Keep it in the ledger with the medicines, so a steroid cream counts.',
        'Route to a dermatologist when a pattern needs one.'],
        ['Age and stage (newborn, child, pregnant)', 'Skin conditions and allergies on file', 'Other steroids already in the ledger'],
        'naming a skin disease from a photo of skin; product recommendations paid for by a brand.'),
])

ROUTES = [
    ('Rice and sweets at most dinners; HbA1c at watch', 'A 12-week sugar plan; a walk after dinner on the daily plan', 'Dietitian consult (care); HbA1c retest in 3 months (lab)'),
    ('Low iron on the report; tea with every meal', 'Tea an hour away from meals; lemon on dal', 'Iron studies retest in 3 months (lab)'),
    ('Under 4,000 steps a week; weight at watch', '10-minute walk after lunch; stairs task', 'Beginner fitness class near home (fitness)'),
    ('Three vitamin D products at once', 'Explain the stack; one question for the doctor', 'Cheeku Doctor review, ₹49, or the prescriber'),
    ('Steroid cream used daily for weeks', 'Explain why steroids need a plan', 'Dermatologist consult (care)'),
    ('Packaged snacks and pickle most days; BP at act', 'Salt habits on the plan; morning BP readings', 'Doctor consult (care); BP monitor via partner'),
    ('Pregnant, week 20, skipping breakfast', 'Gentle breakfast habit; iron and folic acid reminder', 'Gynaecologist follow-up (care); no diets'),
    ('Child, fried snacks after school most days', 'Swap ideas the child can pick from', 'Paediatric nutritionist only if growth is off (care)'),
]
def routes_table():
    rows = ''.join('<tr><td class="l">%s</td><td class="l">%s</td><td class="l"><b>%s</b></td></tr>' % r for r in ROUTES)
    return '<table><thead><tr><th class="l">What the engine sees</th><th class="l">Practise (free, on the plan)</th><th class="l">Act (booked in the chat)</th></tr></thead><tbody>' + rows + '</tbody></table>'

PROFILES = [
    ('Expecting', 'journey: expecting · pregnancy clock', 'Iron, sugar in pregnancy, BP, weight gain by week, scans due', 'Iron with vitamin C, no raw papaya or unpasteurised milk, caffeine under 200 mg', 'Safe in pregnancy? Retinoids, high salicylic, some herbal supplements flagged', 'Gynaecologist, scans, GTT at 24 to 28 weeks', 'No weight-loss goals, no BMI marks, pregnancy red flags skip the model'),
    ('New parent and baby', 'journey: new_parent · day of life', 'Baby: weight, jaundice by day, feeds, vaccines. Parent: sleep, recovery, mood', 'Breastfeeding diet, what passes into milk', 'Baby creams and oils: steroids, fragrance, nappy area', 'Paediatrician, vaccines, postpartum check', 'Thresholds by day of life; a newborn fever goes straight to a doctor'),
    ('Child', 'clock: child or teen', 'Growth, check-ups, vaccines, activity, sleep', 'Lunchbox and after-school snacks, no labels like "bad food"', 'Lice shampoos, acne creams for teens', 'Paediatrician, dentist, eye check', 'Gentle habits only; no weight or sugar goals; parent sees, child is not shamed'),
    ('Student or young adult', 'age 18 to 30 · campus', 'Sleep, movement, sick days, mental load', 'Mess and hostel food, protein, late-night eating', 'Gym supplements and protein powders, acne products', 'Cheeku Doctor on sick days, fitness classes', 'No supplement selling; protein claims checked against the label'),
    ('Working adult at watch', 'sugar, BP or weight at watch', 'Sugar, BP, LDL, weight, sleep, steps', 'Rice and roti balance, chai sugar, office and outside food', 'Painkillers taken often, pre-workout drinks', 'Dietitian, retest in 3 to 6 months, fitness', 'The plan is habits, not a diet; the doctor decides on medicines'),
    ('Women\'s health', 'journey: fertility · PCOS or thyroid on file', 'Cycles, weight, sugar and insulin markers, thyroid, iron', 'Protein and fibre, timing with thyroid medicine', 'Hair and skin products, hormone-related ingredients', 'Gynaecologist, endocrinologist, labs', 'No fertility promises; cycle data is private by default'),
    ('Parent cared for by a child', 'journey: caregiver · older adult', 'BP, sugar, kidney, falls, medicines, check-ups', 'Salt, soft protein, hydration, sugar in sweets at festivals', 'Many medicines: stacking, interactions, kidney doses', 'Doctor, home tests, physio, elder care at home', 'Alerts go to the caregiver with consent; the parent can always see their own file'),
    ('Health optimiser', 'journey: optimiser · all areas on track', 'Trends, retests on time, sleep and fitness depth', 'Protein, fibre, eating window, alcohol', 'Supplement stacks, skincare actives', 'Full-body panels yearly, fitness, coaching', 'Evidence only: no anti-ageing claims, no unproven supplements'),
]
def profiles_html():
    out = []
    for name, who, watches, eaten, body, act, rule in PROFILES:
        out.append('<div class="prof"><span class="lv">%s</span><h3>%s</h3><dl><dt>Watches</dt><dd>%s</dd><dt>Eaten</dt><dd>%s</dd><dt>Taken and applied</dt><dd>%s</dd><dt>Acts through</dt><dd>%s</dd></dl><p class="nv">%s</p></div>' % (who, name, watches, eaten, body, act, rule))
    return '<div class="profs">' + ''.join(out) + '</div>'

PRACTICES = [
    ('Move', '10-minute walk after meals · 7,000 steps · two strength sessions a week · stairs over lifts', 'Sugar, weight, heart, movement'),
    ('Eat', 'Half the plate sabzi · protein at every meal · tea away from meals · less salt, pickle and packaged food · fruit over juice', 'Sugar, BP, LDL, weight, iron'),
    ('Sleep', 'Same wake time daily · screens off 30 minutes before bed · no chai after 4 pm', 'Sleep, heart, sugar'),
    ('Mind', 'Two minutes of slow breathing · a walk outside · one call to a friend', 'Sleep, BP'),
    ('Check', 'Morning BP twice a week · weigh once a week · retests on time · medicines at the same time daily', 'Check-ups, heart, sugar'),
    ('Apply', 'Sunscreen outdoors · patch-test new products · no steroid creams without a plan', 'Skin, the ledger'),
]
def practices_html():
    return '<div class="pracs">' + ''.join('<div class="prac"><b>%s</b><span>%s</span><em>Moves: %s</em></div>' % p for p in PRACTICES) + '</div>'

css = re.search(r'<style>(.*?)</style>', (here.parent / 'cheeku-doctor' / 'template.html').read_text(), re.S).group(1)
extra = '''
.hero h1 { max-width: 26ch; }
.legend p { margin: 0; }
.iso.stack { min-width: 460px; max-height: 440px; }
.mark { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 650; padding: 3px 9px; border-radius: 999px; }
.mark.ok { background: var(--safe-bg); color: var(--safe); } .mark.wa { background: var(--warn-bg); color: var(--warn); } .mark.ac { background: var(--bad-bg); color: var(--bad); }
td.l, th.l { text-align: left; white-space: normal; }
.areas { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.area { background: var(--soft); border-radius: 18px; padding: 16px; display: grid; gap: 8px; align-content: start; }
.area h3 { font: 400 22px/1.1 var(--display); } .area .src { font-size: 11.5px; color: var(--muted); font-weight: 650; letter-spacing: .04em; text-transform: uppercase; }
.area ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 13px; color: var(--ink-2); }
.area .mark { white-space: nowrap; }
.area li { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 8px; align-items: baseline; }
@media (max-width: 860px) { .areas { grid-template-columns: minmax(0, 1fr); } }
.flow { display: grid; gap: 8px; }
.fstep { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 12px; align-items: center; background: var(--soft); border-radius: 14px; padding: 10px 14px; }
.fstep > i { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: #fff; font: 700 12px/28px var(--body); text-align: center; font-style: normal; }
.fstep.gate > i { background: var(--bad); } .fstep.model > i { background: var(--navy); }
.fstep b { display: block; font-size: 14px; } .fstep span { font-size: 12.5px; color: var(--ink-2); line-height: 1.4; }
.fstep .own { white-space: nowrap; }
pre.code { margin: 0; background: var(--navy); color: #E9E7FF; border-radius: 16px; padding: 16px 18px; font: 12.5px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow-x: auto; white-space: pre; }
pre.code .c { color: #A9A3F5; }
.react { display: grid; gap: 8px; }
.rx { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1.3fr); gap: 10px; align-items: center; background: var(--soft); border-radius: 14px; padding: 12px 14px; font-size: 13.5px; }
.rx .arr { color: var(--accent); font-weight: 700; text-align: center; } .rx b { display: block; font-size: 12px; color: var(--muted); font-weight: 650; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
.rx q { color: var(--ink); font-style: italic; quotes: none; }
@media (max-width: 760px) { .rx { grid-template-columns: minmax(0, 1fr); } .rx .arr { transform: rotate(90deg); justify-self: start; } }
.build { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 860px) { .build { grid-template-columns: minmax(0, 1fr); } }
.state { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.state.b { background: var(--safe-bg); color: var(--safe); } .state.n { background: var(--accent-soft); color: var(--accent-2); }
.doors .lt, .doors .ls { paint-order: stroke; stroke: var(--soft); stroke-width: 5px; stroke-linejoin: round; }
.lenses { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.lens { border-radius: 18px; padding: 16px; display: grid; gap: 10px; align-content: start; background: var(--soft); }
.lens.l1 { background: var(--accent-soft); } .lens.l3 { background: var(--warn-bg); }
.lens .lv { font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; color: var(--accent-2); }
.lens.l3 .lv { color: var(--warn); }
.lens h3 { font: 400 26px/1.05 var(--display); }
.lens ol { margin: 0; padding-left: 18px; display: grid; gap: 5px; font-size: 13px; color: var(--ink-2); line-height: 1.4; }
.lens .rd { background: var(--page); border-radius: 12px; padding: 10px 12px; font-size: 12.5px; }
.lens .rd b { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.lens .rd ul { margin: 4px 0 0; padding-left: 16px; display: grid; gap: 2px; color: var(--ink-2); }
.nv { font-size: 12.5px; color: var(--bad); line-height: 1.4; } .nv b { color: var(--bad); }
@media (max-width: 860px) { .lenses { grid-template-columns: minmax(0, 1fr); } }
.profs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.prof { background: var(--soft); border-radius: 18px; padding: 16px; display: grid; gap: 8px; align-content: start; }
.prof .lv { font-size: 11px; font-weight: 650; color: var(--muted); }
.prof h3 { font: 400 22px/1.1 var(--display); }
.prof dl { margin: 0; display: grid; gap: 6px; } .prof dt { font-size: 10.5px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); } .prof dd { margin: 0; font-size: 12.5px; color: var(--ink-2); line-height: 1.4; }
.prof .nv { border-top: 1px solid var(--line); padding-top: 8px; }
@media (max-width: 1000px) { .profs { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (max-width: 560px) { .profs { grid-template-columns: minmax(0, 1fr); } }
.pracs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.prac { background: var(--soft); border-radius: 16px; padding: 14px; display: grid; gap: 6px; align-content: start; }
.prac b { font: 400 22px/1 var(--display); color: var(--accent); } .prac span { font-size: 13px; color: var(--ink-2); line-height: 1.45; } .prac em { font-style: normal; font-size: 11.5px; color: var(--muted); }
@media (max-width: 760px) { .pracs { grid-template-columns: minmax(0, 1fr); } }
.fine { font-size: 11.5px; color: var(--muted); padding: 0 32px 26px; max-width: 100ch; }
'''

def fsteps(rows):
    out = []
    for n, (kind, t, s, who) in enumerate(rows, 1):
        out.append('<div class="fstep %s"><i>%s</i><div><b>%s</b><span>%s</span></div><span class="own">%s</span></div>' % (kind, '!' if kind == 'gate' else n, t, s, who))
    return '<div class="flow">' + ''.join(out) + '</div>'

A, S_, Ar, Cl = '<span class="own">Athar</span>', '<span class="own">Suraj</span>', '<span class="own">Archit</span>', '<span class="own">Clinical lead</span>'

report_flow = fsteps([
    ('', 'A report arrives', 'Upload, WhatsApp forward, or filed by itself when a booked lab test comes back through the partner.', Ar),
    ('', 'Parse and extract', 'Picture to text, then text to named values with units. Low-confidence fields are flagged, never guessed.', S_),
    ('', 'Normalise', 'Map every test name to one analyte key (hba1c, ldl, tsh), convert units, attach the date the sample was taken.', S_),
    ('', 'Write to memory', 'Series gets the new point with its previous value, delta and rate. A booked test closes its open loop.', Ar),
    ('', 'Recompute the areas', 'The six areas re-run from fresh signals. If a mark changes, a snapshot is written.', Ar),
    ('', 'Say what changed', 'A change card: "LDL 162 to 138, down 15% since the plan started". Shown on Home and in the chat.', A),
    ('', 'Adjust the plan and the next test', 'An area moving to act adds its goal tasks; the retest is scheduled from the cadence table.', A),
])
chat_flow = fsteps([
    ('', 'A question, typed or spoken', '"Papa ka sugar kaisa hai?" Voice turns into text first (Sarvam, translate mode).', A),
    ('', 'Who and what', 'Which family member, and whether it is a booking, a log or a question.', A),
    ('gate', 'Safety gate first', 'Hard stops (chest pain, breathlessness, pregnancy red flags) skip the model and go straight to help.', S_),
    ('', 'Structured context, from code', 'The person\'s clock, areas, latest values with deltas, medicines, open loops, today\'s plan, watch notes. About 4,000 tokens, exact numbers.', Ar),
    ('', 'Retrieval, only for the long tail', 'Report and prescription text the structure does not hold ("what did the doctor write about my liver?"). Top 6 chunks, this person only.', S_),
    ('model', 'The model explains', 'Writes in the person\'s language, cites the record, proposes actions from an allowed list. It never sets a mark.', S_),
    ('gate', 'The floor holds', 'The answer\'s care tier is the higher of the model\'s and the rules\'. A model can make it more careful, never less.', S_),
    ('', 'Back into memory', 'Numbers said in the chat ("BP 138/88 today") become facts; corrections supersede the old value and the answer says so.', Ar),
])
food_flow = fsteps([
    ('', 'Snap the plate', 'Camera from the plan, the chat or the + button. Works offline; uploads later.', A),
    ('', 'The model reads it', 'Names Indian dishes and suggests tags and a portion in katoris. Unsure items are asked, not guessed.', S_),
    ('', 'One tap to confirm', 'The person fixes or confirms. Confirmed tags are what the rules run on.', A),
    ('gate', 'Rules read it against this person', 'Sugar, BP, LDL, liver, kidney, iron, pregnancy week, medicines. Code picks the line and tips.', Ar),
    ('model', 'The model says it kindly', 'One line on the plate, at most two tips, in their language. Never "bad food", never calories.', S_),
    ('', 'Patterns over a week', 'Rice at dinner 5 of 7 nights; no protein at breakfast. Feeds the Sunday review and the areas.', Ar),
    ('', 'Practise or act', 'A habit on tomorrow\'s plan, or a dietitian or fitness class booked when the pattern and the numbers both point there.', A),
])
daily_flow = fsteps([
    ('', 'Morning nudge', 'One line, built from the area most in need: "Walk 10 minutes after lunch today. Your sugar plan, week 3."', A),
    ('', 'Today\'s plan', 'Two to four tasks from the goal, after anything due (a medicine, a retest).', A),
    ('', 'Logs come in', 'Ticks, steps from the watch, a reading said in chat. Saved to the day.', Ar),
    ('', 'Sunday review', 'What moved this week, one change for next week, the plan re-set. 60 seconds.', A),
    ('', 'Quarterly retest', 'The test that proves it worked, booked in chat, filed by itself, with a change card.', A),
])

INPUTS = [
    ('Food snap', 'Photo of the plate, then one tap to confirm the tags', 'daily_logs (kind meal) + intake_items', 'Dishes, tags, portion in katoris, time, the photo', 'Medium: a photo, confirmed by the person', 'Suraj'),
    ('Taken product snap', 'Photo of a strip, bottle, sachet, protein tub or drink label', 'intake_items → ledger', 'Ingredients, dose, licence class, how often', 'High for the label, medium for how often', 'Suraj'),
    ('Applied product snap', 'Photo of a cream, oil, shampoo or skincare label', 'intake_items → ledger', 'Ingredients, where it is used, how often', 'High for the label', 'Suraj'),
    ('Lab report', 'Upload, WhatsApp share, or auto-filed from a booked partner test', 'documents, entities → series', 'Values, units, ranges, sample date, lab', 'Highest', 'Suraj'),
    ('Prescription', 'Photo or PDF; Cheeku Doctor writes its own', 'documents → ledger, rx_scorecards', 'Medicines by ingredient, dose, duration, prescriber, 10 checks', 'High', 'Suraj'),
    ('Chat and voice', 'What people tell Cheeku in their own words', 'memory_facts', 'Readings, symptoms, corrections, goals', 'Medium: said, not measured', 'Suraj'),
    ('Watch and phone', 'Apple Health, Health Connect, Google Health, Strava', 'wearable_days', 'Steps, sleep, resting heart rate, HRV, weight, BP cuff', 'Medium: averaged over a week', 'Archit'),
    ('Daily logs', 'Ticks on today\'s plan, steps, sleep, meals', 'today_actions, daily_logs', 'Did the habit happen', 'Behaviour, not a measurement', 'Archit'),
    ('Bookings and results', 'Tests and doctor visits booked in chat', 'lab_bookings, open_loops', 'What was ordered, what came back, what is still open', 'High', 'Archit'),
    ('Profile and family', 'Sign-up, family members, the health file', 'profiles, profile_relations, pregnancies', 'Age, sex, conditions, allergies, pregnancy, who is related', 'High', 'Archit'),
    ('Family history', 'Two questions at sign-up, then learned from family members\' files', 'profile_relations (new fields)', 'Parent with diabetes, heart disease, early stroke, thyroid', 'Medium: said, not a record', 'Archit'),
    ('Goal answers', 'Two quick questions when someone picks a goal', 'profiles.daily_prefs', 'Which habits to start, what time to remind', 'Preference', 'Athar'),
]
def inputs_table():
    rows = ''.join('<tr><td class="l"><b>%s</b></td><td class="l">%s</td><td class="l"><code>%s</code></td><td class="l">%s</td><td class="l">%s</td><td class="l">%s</td></tr>' % r for r in INPUTS)
    return '<table><thead><tr><th class="l">Input</th><th class="l">How it arrives</th><th class="l">Where it lands</th><th class="l">What we keep</th><th class="l">Trust</th><th class="l">Owner</th></tr></thead><tbody>' + rows + '</tbody></table>'

def area(title, src, rows):
    li = ''.join('<li><span class="mark %s">%s</span><span>%s</span></li>' % (c, l, t) for c, l, t in rows)
    return '<div class="area"><span class="src">%s</span><h3>%s</h3><ul>%s</ul></div>' % (src, title, li)
AREAS = ''.join([
    area('Heart and BP', 'Reports · readings · watch', [('ac', 'Act', 'BP 140/90 or more; LDL 160 or more'), ('wa', 'Watch', 'BP 130/80 or more; LDL 130 or more; resting heart rate up on last week or 90+'), ('ok', 'On track', 'Below those lines')]),
    area('Sugar', 'Reports · readings', [('ac', 'Act', 'HbA1c 6.5% or more; fasting 126 or more'), ('wa', 'Watch', 'HbA1c 5.7 to 6.4%; fasting 100 to 125'), ('ok', 'On track', 'Below 5.7% or fasting under 100')]),
    area('Weight', 'Reports · readings', [('ac', 'Act', 'BMI 27.5 or more, or under 17 (Indian cut-offs)'), ('wa', 'Watch', 'BMI 23 to 27.4 or under 18.5; weight moved 5% or more'), ('ok', 'On track', 'BMI 18.5 to 22.9; weight steady')]),
    area('Sleep', 'Watch · logs', [('ac', 'Act', 'Under 6 hours a night, week average'), ('wa', 'Watch', '6 to 7 hours'), ('ok', 'On track', '7 hours or more')]),
    area('Movement', 'Watch · logs', [('ac', 'Act', 'Under 4,000 steps a day, week average'), ('wa', 'Watch', '4,000 to 6,999'), ('ok', 'On track', '7,000 or more')]),
    area('Check-ups', 'Open loops', [('ac', 'Act', 'A test or follow-up is overdue'), ('wa', 'Watch', 'Something is due within a month'), ('ok', 'On track', 'Nothing overdue')]),
])

CADENCE = [
    ('HbA1c', 'Every 3 months, or as the doctor sets', 'Every 6 months', 'Yearly from 30 if a parent has diabetes; otherwise every 3 years from 35'),
    ('Lipid profile', 'Every 6 months', 'Yearly', 'Yearly from 30 if a parent had early heart disease; otherwise every 3 to 5 years'),
    ('Home BP', 'Weekly readings, 2 in the morning', 'Fortnightly readings', 'Monthly, if the person has a cuff'),
    ('Thyroid (TSH)', 'As the doctor sets', 'Every 6 months', 'Yearly for women 30+ with a family history'),
    ('Vitamin D, B12', '3 months after a low result', '6 months after a borderline result', 'Not routine'),
    ('Kidney (creatinine, urine ACR)', 'Every 6 months with sugar or BP at act', 'Yearly', 'With the annual check-up'),
]
def cadence_table():
    rows = ''.join('<tr><td class="l"><b>%s</b></td><td class="l">%s</td><td class="l">%s</td><td class="l">%s</td></tr>' % r for r in CADENCE)
    return '<table><thead><tr><th class="l">Test</th><th class="l">Area at act</th><th class="l">Area at watch</th><th class="l">On track, by age and family history</th></tr></thead><tbody>' + rows + '</tbody></table>'

REACT = [
    ('Sugar at act, HbA1c 6.8%', '"Your HbA1c was 6.8% in October, up from 6.1% in March. That is the range a doctor treats, so it is worth showing Dr Rao. Meanwhile, a 10-minute walk after meals helps most people. Want me to book a doctor or start a sugar plan?"'),
    ('Sugar at watch, fasting 103', '"Fasting sugar 103 is a little high. An HbA1c shows the three-month picture; you are due one in January. One small habit for now: walk after dinner."'),
    ('Two values disagree', '"Your report says 78 kg on 2 Nov; you told me 74 kg yesterday. I am using the report until the next weigh-in. Was 74 from a home scale?"'),
    ('Signal older than 18 months', '"Your last cholesterol test was in 2024. That is too old to go by, so I have not marked your heart area. A lipid test would tell us where you are."'),
    ('Only the watch says so', '"Your watch shows about 5.5 hours of sleep this week." Softer words, no medical claim: a watch estimate is not a sleep study.'),
    ('A plate with rice, fried snack and sweet; HbA1c 6.1%', '"Nice that dal is in. With your sugar in the early-warning band, swapping the sweet for fruit tomorrow helps most. Want to try a walk after dinner too?"'),
    ('Three vitamin D products in the ledger', '"Your multivitamin, the calcium tablet and the D3 sachet all carry vitamin D, about 4,000 IU a day together. Worth checking with your doctor whether you need all three."'),
    ('Steroid cream on a baby\'s nappy area', '"This cream has a steroid. On a baby\'s nappy area it needs a doctor\'s plan for how long. Can I book the paediatrician?"'),
    ('Pregnant, or a child', 'No weight or sugar goals, no BMI marks. Only gentle habits for children. Pregnancy questions follow the pregnancy clock and its own red flags.'),
    ('A hard stop in the message', 'The model is not called. The answer is the hard-stop card: where to go, what to say, one tap to call.'),
]
def react():
    return '<div class="react">' + ''.join('<div class="rx"><div><b>The engine says</b>%s</div><span class="arr">→</span><div><b>The model says</b><q>%s</q></div></div>' % r for r in REACT) + '</div>'

CONTRACT = '''<span class="c">// LongevityState: what the app and the AI layer both read. One per family member, rebuilt on any change.</span>
{
  "profileId": "b111…",
  "asOf": "2027-03-14",
  "clock": { "stage": "adult", "ageYears": 34, "pregnant": false },
  "areas": [
    { "key": "sugar", "status": "watch",
      "line": "Average sugar (HbA1c) 5.9% is in the early-warning band.",
      "signals": [ { "source": "report", "date": "2026-10-24", "key": "hba1c", "value": 5.9, "prev": 6.1, "docId": "1b45…" } ] },
    { "key": "sleep", "status": "unknown", "line": "Nothing to go on yet.", "signals": [] }
  ],
  "focus": ["sugar", "heart"],                       <span class="c">// act first, then watch</span>
  "targets": [ { "test": "hba1c", "cadenceDays": 180, "nextDue": "2027-04-24",
                 "why": "HbA1c 5.9% and a parent with diabetes", "ruleVersion": "cad-2027.1" } ],
  "plan": { "goal": "sugar", "week": 3, "tasks": ["walk_after_lunch", "no_sugar_chai"] },
  "loops": [ { "title": "Lipid profile", "dueBy": "2027-01-10", "overdue": true } ],
  "intake": {                                         <span class="c">// last 7 days, what went in</span>
    "meals": 17, "patterns": ["rice_dinner_5_of_7", "no_protein_breakfast"],
    "ledger": [ { "name": "Vitamin D3 60K", "class": "food_supplement", "ingredients": ["cholecalciferol"], "flags": ["stacking"] },
                { "name": "Betamethasone cream", "class": "drug", "route": "skin", "flags": ["steroid_long_use"] } ]
  },
  "lens": { "journey": "caregiver", "stage": "adult", "never": ["weight_goal_in_pregnancy"] },
  "changes": [ { "key": "ldl", "from": 162, "to": 138, "date": "2027-03-10",
                 "line": "LDL 162 to 138, down 15% since the plan started" } ]
}'''

TABLES = '''<span class="c">-- Proposals for Archit. Numbers continue after migration 0044.</span>
create table longevity_snapshots (          <span class="c">-- one row a day per person, only when a mark changes</span>
  profile_id uuid references profiles not null,
  day date not null,
  areas jsonb not null,                     <span class="c">-- [{key, status, line, signalKeys}]</span>
  inputs_hash text not null,                <span class="c">-- skip the write if nothing changed</span>
  primary key (profile_id, day)
);
create table longevity_targets (            <span class="c">-- the next test, and why</span>
  profile_id uuid references profiles not null,
  test text not null,                       <span class="c">-- hba1c, lipid, tsh…</span>
  cadence_days int not null,
  next_due date not null,
  why text not null,
  rule_version text not null,               <span class="c">-- which signed cadence table set it</span>
  primary key (profile_id, test)
);
create table report_chunks (                <span class="c">-- retrieval, one person at a time</span>
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles not null,
  document_id uuid references documents not null,
  chunk text not null,                      <span class="c">-- a line or table row, never cut mid-word</span>
  embedding vector(384) not null,
  embed_model text not null,                <span class="c">-- never search across two models</span>
  sample_date date
);
create table intake_items (                 <span class="c">-- what is taken and applied, beyond prescriptions</span>
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles not null,
  kind text not null,                       <span class="c">-- taken | applied</span>
  name text not null,
  licence_class text,                       <span class="c">-- drug | food_supplement | cosmetic | unknown</span>
  ingredients jsonb not null,               <span class="c">-- [{key, amount, unit}]</span>
  route text,                               <span class="c">-- mouth | skin | scalp | eye…</span>
  frequency text, started_on date, stopped_on date,
  photo_path text, confidence real
);
<span class="c">-- Food stays in daily_logs (kind meal); the model's reading goes in daily_logs.analysis.</span>
<span class="c">-- RLS on all four: the owner's family only, same rules as documents.</span>'''

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Longevity Engine Build</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,400..750&display=swap">
<style>{css}{extra}</style>
</head>
<body>

<article class="sheet" aria-label="Sheet 1: what the engine is">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Longevity engine · build document · 1 / 6</span></div>
  <section class="hero">
    <h1>The longevity engine. <em>Every number a family has, turned into the next right habit.</em></h1>
    <p class="lede">It reads what each person eats, takes and puts on their skin, along with every report, reading and watch day. It keeps it on one timeline per person, marks six areas of health, and turns the ones that need attention into a daily plan, a nudge and the next test. The model explains; rules and code decide. This document is how we build it: Suraj owns the AI and retrieval, Archit the app and data layer.</p>
    <div class="tags"><span class="tag v">Areas, not a score</span><span class="tag">Rules decide, the model explains</span><span class="tag">Partial beats wrong</span><span class="tag">For the team only</span></div>
    <div class="stats">
      <div class="stat"><b>6</b><span>areas per person: heart, sugar, weight, sleep, movement, check-ups</span></div>
      <div class="stat"><b>12</b><span>kinds of input: what is eaten, taken and applied, reports, the watch</span></div>
      <div class="stat"><b>18 mo</b><span>a signal older than this is dropped, never trusted</span></div>
      <div class="stat"><b>₹0.07</b><span>a chat with about 4,000 tokens of family context</span></div>
    </div>
  </section>

  <section class="blk">
    <div class="k">The whole engine</div>
    <h2>Eight stations, <em>one loop that never ends.</em></h2>
    <div class="isoWrap scroll">{system_map()}</div>
    {legend()}
    <p class="cap">Stations 1 to 4 run whenever something new arrives. Station 5 is the output everything else reads. Stations 6 to 8 are what the family sees. The retest result comes back in at station 1, which is how the loop proves itself.</p>
  </section>

  <section class="blk">
    <div class="k">Decided, 11 November 2026</div>
    <h2>No health age. No single score. <em>Six areas, each with a reason.</em></h2>
    <div class="areas">{AREAS}</div>
    <p class="cap">An area takes its worst fresh signal, so one bad sugar report is not averaged away by good step counts. Cut-offs are the common screening lines a doctor would also use, with Indian BMI cut-offs. Adults only for the numbers; a child's areas come from check-ups and the watch. Built in <code>src/lib/longevity/areas.ts</code> and <code>src/modules/wearables/insights.ts</code>. Any change to a cut-off is signed by our clinical lead.</p>
  </section>
</article>

<article class="sheet" aria-label="Sheet 2: what goes into the body">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Longevity engine · 2 / 6</span></div>
  <section class="blk" style="border-top:0">
    <div class="k">The three doors</div>
    <h2>Eaten, taken, applied. <em>Everything that goes into the body, read for this person.</em></h2>
    <p class="lede">Reports show where a person is. What they eat, take and put on their skin every day is what moves them. Each is a snap away, read against their own numbers, and turned into one thing to understand, one habit and, when it needs one, a booking.</p>
    <div class="isoWrap scroll">{doors_iso()}</div>
    <div class="lenses">{LENSES}</div>
    <p class="cap">Built on what exists: the plate reader in <code>src/lib/home/meals.ts</code> (photo kept, tags confirmed, one line and two tips, no calories), the product check, and the medicine ledger in <code>src/lib/memory/ledger.ts</code>, which already sorts drug, FSSAI food and cosmetic licences and catches ingredient stacking. New: the model reads the photo to suggest the tags, supplements and applied products join the ledger, and weekly patterns feed the areas.</p>
  </section>
  <section class="blk">
    <div class="k">From what we see to what they do</div>
    <h2>Understand, practise, act. <em>Care and fitness are one tap away.</em></h2>
    <div class="scroll">{routes_table()}</div>
    <p class="cap">Every act ends in something the family can book inside the chat: a dietitian, a doctor, a dermatologist, a fitness class, a home test, or Cheeku Doctor for ₹49. A booking is suggested once, with one line of why, and never pushed again that week. The plan and the nudges are free; the booking is where we earn.</p>
  </section>
</article>

<article class="sheet" aria-label="Sheet 3: personal by design">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Longevity engine · 3 / 6</span></div>
  <section class="blk" style="border-top:0">
    <div class="k">Personal by design</div>
    <h2>Same engine, <em>a different engine for every person.</em></h2>
    <p class="lede">The engine picks its lens from the person's clock (age, pregnancy week, day of life), their journey, the conditions and medicines on file, and their goal. What it watches, how it reads a plate or a label, where it routes, and what it must never say all change with it.</p>
    {profiles_html()}
    <p class="cap">A family holds several of these at once: a pregnant mother, a father with BP at watch and a grandparent on six medicines each get their own engine, and the caregiver sees the family view. The journey field is a hint for content, never a clinical fact; the clock and records decide the thresholds.</p>
  </section>
  <section class="blk">
    <div class="k">Good practices</div>
    <h2>Small habits, <em>chosen by the area that needs them.</em></h2>
    {practices_html()}
    <p class="cap">Each practice is a task in the habit catalogue (<code>src/lib/home/catalog.ts</code>), written to the content system's rules. The plan picks two to four a day from the person's focus areas and goal, after anything due. Practices that a stage forbids (weight goals in pregnancy, strength work for a newborn's mother in week one) are never offered.</p>
  </section>
</article>

<article class="sheet" aria-label="Sheet 4: inputs and memory">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Longevity engine · 4 / 6</span></div>
  <section class="blk" style="border-top:0">
    <div class="k">What goes in</div>
    <h2>Twelve inputs. <em>Each one knows where it came from.</em></h2>
    <div class="scroll">{inputs_table()}</div>
    <p class="cap">Trust decides which value wins when two disagree: a lab report beats a home reading, a home reading beats a number remembered in chat. The engine never resolves a contradiction silently; it shows both and says which it is using.</p>
  </section>

  <section class="blk">
    <div class="k">The longitudinal memory</div>
    <h2>Six layers, <em>each built on the one below.</em></h2>
    <div class="grid2" style="align-items:center">
      <div class="isoWrap scroll">{memory_stack()}</div>
      <div class="box"><h3>Why it is built this way</h3><ul>
        <li><b>A clock, not a birthday.</b> The same bilirubin is safe on day 3 and not on day 6. Thresholds are looked up by the person's clock.</li>
        <li><b>Trends, not snapshots.</b> Every number carries its previous value, delta and rate, so "99/64" is read as a 33-point drop.</li>
        <li><b>Medicines by ingredient.</b> Three products with vitamin D add up; the ledger catches it.</li>
        <li><b>Open loops.</b> A bill listing a test with no result means a result is missing.</li>
        <li><b>Corrections are visible.</b> A fact that changes supersedes the old one, and the answer says what changed.</li>
        <li><b>Area history is new.</b> Snapshots let us say "your sugar moved from act to watch since March", the moment that keeps people.</li>
      </ul></div>
    </div>
    <p class="cap">Layers 1 to 5 exist in the app today (<code>src/lib/memory</code>, migrations 0002, 0030, 0034, 0042, 0044). Full reasoning in <code>docs/health-memory-layer-spec.md</code>.</p>
  </section>
</article>

<article class="sheet" aria-label="Sheet 5: how it works">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Longevity engine · 5 / 6</span></div>
  <section class="blk" style="border-top:0">
    <div class="k">Flow 1 · a new report</div>
    <h2>From a photo <em>to a changed plan, in under a minute.</em></h2>
    {report_flow}
  </section>
  <section class="blk">
    <div class="k">Flow 2 · a question in the chat</div>
    <h2>Structure first, <em>retrieval for the long tail.</em></h2>
    {chat_flow}
    <div class="grid2">
      <div class="box"><h3>Retrieval, as Suraj's research set it</h3><ul>
        <li>Switch the embedder to <code>multilingual-e5-small</code> before launch: Hindi and Hinglish, still 384 numbers, so no schema change. Use the <code>query:</code> and <code>passage:</code> prefixes.</li>
        <li>Chunk on lines and table rows, so "Haemoglobin" and "11.2" stay together. Never cut mid-word.</li>
        <li>Re-embed everything once; store the model name on every vector and never search across two.</li>
        <li>Self-hosted, so report text stays on our servers in India.</li>
      </ul></div>
      <div class="box"><h3>Why not retrieval for everything</h3><ul>
        <li>The model must never do arithmetic on health numbers. Values, deltas and marks come from code, exactly.</li>
        <li>The structured context is small and always complete; retrieval can miss a row.</li>
        <li>Retrieval answers what structure cannot hold: a doctor's note, a scan impression, advice written on a prescription.</li>
        <li>Every retrieved chunk is cited back to its document in the answer.</li>
      </ul></div>
    </div>
  </section>
  <section class="blk">
    <div class="k">Flow 3 · a food snap</div>
    <h2>From a photo of lunch <em>to tomorrow's habit.</em></h2>
    {food_flow}
  </section>
  <section class="blk">
    <div class="k">How the model reacts</div>
    <h2>Same engine output, <em>said the way a good doctor would.</em></h2>
    {react()}
    <p class="cap">The model writes; it never diagnoses, never names a disease the person does not already have on record, never tells anyone to start or stop a medicine. It can propose actions only from an allowed list: start a goal, book a test, book a doctor, open a screen.</p>
  </section>
  <section class="blk">
    <div class="k">Flow 4 · every day</div>
    <h2>Daily, weekly, quarterly. <em>Something is always due.</em></h2>
    {daily_flow}
  </section>
</article>

<article class="sheet" aria-label="Sheet 6: build plan">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Longevity engine · 6 / 6</span></div>
  <section class="blk" style="border-top:0">
    <div class="k">Personal targets</div>
    <h2>The next test, <em>set by the person's own numbers and family.</em></h2>
    <div class="scroll">{cadence_table()}</div>
    <p class="cap">Draft cadences for our clinical lead to sign; each signed version gets a <code>rule_version</code> stored with every target it sets. A target becomes an open loop when it is due, and the retest is offered in the chat with home collection.</p>
  </section>

  <section class="blk">
    <div class="k">The contract between the two layers</div>
    <h2>One shape both sides read. <em>Built by code, explained by the model.</em></h2>
    <pre class="code">{CONTRACT}</pre>
    <pre class="code">{TABLES}</pre>
  </section>

  <section class="blk">
    <div class="k">Who builds what</div>
    <div class="build">
      <div class="box"><h3>Suraj · AI and retrieval</h3><ul>
        <li>Extraction accuracy on Indian lab formats; low-confidence flags</li>
        <li>Analyte dictionary: every test name to one key and unit</li>
        <li>Embedder switch to multilingual e5, row chunking, re-embed</li>
        <li>Prompt: how the model reads <code>LongevityState</code> and cites</li>
        <li>Model routing and costs: Haiku, Sarvam or GPT-OSS by evals</li>
        <li>Longevity eval set: 300 questions in English, Hindi and Hinglish</li>
        <li>Plate reader: Indian dish recognition to tags, 500 labelled photos first</li>
        <li>Label reader for strips, supplements and cosmetics, with licence class</li>
      </ul></div>
      <div class="box"><h3>Archit · app and data layer</h3><ul>
        <li>Four new tables with RLS, migrations after 0044</li>
        <li>Snapshot writer: recompute areas on any new input, write on change</li>
        <li>Target scheduler: daily job that opens loops when tests fall due</li>
        <li>Server-side watch sync into <code>wearable_days</code></li>
        <li>The model request carries <code>LongevityState</code>; metering as today</li>
        <li>Under 300 ms to rebuild one person's state</li>
        <li>Intake ledger: supplements and applied products next to prescriptions</li>
        <li>Weekly food patterns job, written to the state</li>
      </ul></div>
      <div class="box"><h3>Athar and clinical lead</h3><ul>
        <li>Area cards, change cards and the Sunday review on Home</li>
        <li>Plan tasks and nudges, written to the content system</li>
        <li>Family history: two questions at sign-up</li>
        <li>Snap flows for plate, taken and applied, one tap to confirm</li>
        <li>Profile lenses: what each journey and stage sees and never sees</li>
        <li><b>Clinical lead</b> signs cut-offs, cadences and every red flag</li>
        <li>Monthly review of 50 real answers with the clinical lead</li>
      </ul></div>
    </div>
  </section>

  <section class="blk">
    <div class="k">When</div>
    <h2>Before launch, then <em>one step a month.</em></h2>
    <div class="scroll"><div class="gantt">
      <div class="lb">Multilingual retrieval<span>Suraj</span></div><div class="gtrack"><i class="pl" style="left:0%;width:16%">Nov to Dec '26</i></div>
      <div class="lb">Area snapshots and change cards<span>Archit, Athar</span></div><div class="gtrack"><i style="left:10%;width:18%">Jan to Feb '27</i></div>
      <div class="lb">Longevity evals, 300 cases<span>Suraj, clinical lead</span></div><div class="gtrack"><i style="left:10%;width:26%">Jan to Mar '27</i></div>
      <div class="lb">Target scheduler and retest loop<span>Archit</span></div><div class="gtrack"><i style="left:18%;width:18%">Feb to Mar '27</i></div>
      <div class="lb">Sunday review<span>Athar</span></div><div class="gtrack"><i style="left:26%;width:16%">Mar to Apr '27</i></div>
      <div class="lb">Watch signals server-side<span>Archit</span></div><div class="gtrack"><i style="left:34%;width:18%">Q2 '27</i></div>
      <div class="lb">Family history targets<span>Suraj, Athar</span></div><div class="gtrack"><i style="left:42%;width:26%">Q2 to Q3 '27</i></div>
      <div class="lb">Plate reader from photos<span>Suraj, Athar</span></div><div class="gtrack"><i style="left:26%;width:26%">Mar to Jun '27</i></div>
      <div class="lb">Taken and applied ledger<span>Archit, Suraj</span></div><div class="gtrack"><i style="left:34%;width:22%">Apr to Jun '27</i></div>
      <div class="lb">Profile lenses<span>Athar, clinical lead</span></div><div class="gtrack"><i style="left:18%;width:34%">Feb to Jun '27</i></div>
      <div class="lb">Adapted model explains<span>Suraj</span></div><div class="gtrack"><i style="left:78%;width:22%">Q1 '28</i></div>
      <div class="gscale"><span>Nov '26</span><span>Mar '27</span><span>Jul '27</span><span>Nov '27</span><span>Mar '28</span></div>
    </div></div>
  </section>

  <section class="blk">
    <div class="k">How we know it works</div>
    <div class="grid3">
      <div class="box"><h3>Correct</h3><ul><li>99% of extracted values match the report</li><li>Every eval answer cites the right number and mark</li><li>Zero answers below the safety floor</li></ul></div>
      <div class="box"><h3>Useful</h3><ul><li>60% of active users with three or more areas known by day 30</li><li>Half of due retests booked within 7 days</li><li>Areas moving from act to watch, tracked monthly</li><li>3 or more meals snapped a week by 30% of actives</li><li>1 in 10 act suggestions booked</li></ul></div>
      <div class="box"><h3>Fast and cheap</h3><ul><li>State rebuilt in under 300 ms</li><li>Answer starts in under 2 seconds</li><li>About ₹0.07 a chat, about ₹0 per embedding</li></ul></div>
    </div>
  </section>
  <p class="fine">Built from the app as it stands (src/lib/longevity, src/lib/memory, src/lib/home, src/modules/wearables, supabase/functions/cheeku-chat), docs/health-memory-layer-spec.md and Suraj's notes on model prices and embeddings (7 Nov 2026). Cut-offs and cadences are screening lines, not treatment advice, and are signed by our clinical lead before release. Internal. November 2026.</p>
</article>

</body>
</html>
'''
assert '—' not in html
(here / 'longevity-engine.html').write_text(html)
print(len(html))
