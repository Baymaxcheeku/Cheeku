# Builds acquisition-plan.html. Every model number comes from data.json (node data.js > data.json), i.e. the engine's base case.
import json, re, sys, pathlib
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here.parent / 'cheeku-doctor'))
import iso as ISO
D = json.load(open(here / 'data.json'))
M, UE, SS, LV = D['months'], D['ue'], D['s'], {l['name']: l for l in D['levers']}
L, CR = 1e5, 1e7
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
mon = lambda t: MON[t % 12] + " '" + str(27 + t // 12)
def inr(n):  # Indian grouping
    n = int(round(n)); s = str(abs(n))
    if len(s) > 3:
        h, t = s[:-3], s[-3:]; parts = []
        while len(h) > 2: parts.insert(0, h[-2:]); h = h[:-2]
        if h: parts.insert(0, h)
        s = ','.join(parts + [t])
    return ('-' if n < 0 else '') + s
lakh = lambda n, d=1: ('%.' + str(d) + 'f') % (n / L)
cr = lambda n, d=1: ('%.' + str(d) + 'f') % (n / CR)

# ---- channel plan: shares of the model's marketing line, and CAC ceilings per new active user ----
CH = [('perf', 'Performance ads, agency-run', 'var(--accent)'), ('creator', 'Creator army', 'var(--navy)'), ('hero', 'Hero campaign: free report decode', '#A39CF7'),
      ('ref', 'Referral and family invites', '#E8590C'), ('brand', 'Brand, PR and store listing', 'var(--lav)'),
      ('campus', 'Campus ambassadors', '#0F7538'), ('stays', 'QR in hotels, hostels, PGs', '#3CCF7C'), ('camps', 'Society health camps', '#A7E8C2')]
PH = [  # name, months (t), mix %, CAC ceilings
    ('Launch', range(0, 2), dict(perf=50, creator=20, hero=15, ref=5, brand=10, campus=0, stays=0, camps=0),
     dict(perf=150, creator=120, hero=80, ref=60, brand=160, campus=95, stays=60, camps=300)),
    ('Ground game', range(2, 6), dict(perf=34, creator=25, hero=8, ref=8, brand=7, campus=12, stays=2, camps=4),
     dict(perf=160, creator=115, hero=90, ref=80, brand=160, campus=100, stays=60, camps=300)),
    ('Loops', range(6, 12), dict(perf=25, creator=28, hero=5, ref=10, brand=6, campus=15, stays=5, camps=6),
     dict(perf=180, creator=118, hero=95, ref=88, brand=170, campus=100, stays=60, camps=300)),
    ('Scale, 2028', range(12, 18), dict(perf=27, creator=30, hero=4, ref=12, brand=10, campus=9, stays=4, camps=4),
     dict(perf=200, creator=130, hero=115, ref=100, brand=210, campus=110, stays=70, camps=320)),
]
# Offline unit assumptions (our estimates): ambassador stipend and payout, activations per room, camp cost.
AMB_FEE, AMB_PAY, PAY_SHARE, AMB_PER_CAMPUS = 15000, 15, 0.12, 3
ROOM_RATE, CAMP_COST = 0.06, 20000
def offline(t):
    sp, _ = split(t)
    sc, ac = sp['campus']; ss, a_s = sp['stays']; sk, ak = sp['camps']
    amb = max(0, sc - AMB_PAY * ac * PAY_SHARE) / AMB_FEE
    return dict(camp_spend=sc, camp_users=ac, amb=amb, campuses=amb / AMB_PER_CAMPUS, stay_spend=ss, stay_users=a_s, rooms=a_s / ROOM_RATE,
                camps_spend=sk, camps_users=ak, camps=sk / CAMP_COST)
def phase_of(t): return next(p for p in PH if t in p[1])
def split(t):
    p = phase_of(t); mk = M[t]['mkt']; raw = {k: mk * p[2][k] / 100 / p[3][k] for k, _, _ in CH}
    sc = M[t]['paid'] / sum(raw.values())           # scale to the model's paid new users
    return {k: (mk * p[2][k] / 100, raw[k] * sc) for k, _, _ in CH}, sc
for p in PH:
    _, sc = split(p[1][0]); assert 0.95 < sc < 1.05, (p[0], sc)   # ceilings blend to the model's CAC within 5%

Y27 = UE[0]; Y28 = UE[1]; m13 = M[13]; m11 = M[11]
seedMkt = sum(m['mkt'] for m in M[:13]) + 20 * L      # Dec pre-launch + Jan '27 to Jan '28
paid13 = sum(m['paid'] for m in M[:14]); org13 = sum(m['org'] for m in M[:14])
installs27 = Y27['paid'] / 0.33

# ---- isometric funnel (2027) ----
def funnel():
    steps = [('Installs from paid', lakh(installs27) + ' lakh', 7.0, 'w'), ('New active users', lakh(Y27['paid'] + Y27['org']) + ' lakh', 5.6, 's'),
             ('Monthly users, Dec', lakh(Y27['mauEnd']) + ' lakh', 4.4, 'a'), ('Doctor reviews in year', inr(Y27['rx']), 2.8, 'a'), ('Paying families, Dec', inr(Y27['subsEnd']), 1.5, 'n')]
    items, labels = [], []
    for i, (lab, val, h, kind) in enumerate(steps):
        x = i * 9.0
        items += ISO.prism(x, 0, 4, 4, 0.4, 0, 'p')
        items += ISO.prism(x + 0.5, 0.5, 3, 3, h, 0.4, kind)
        tx, ty = ISO.iso(x + 2, 2, h + 0.4)
        labels.append('<text x="%.1f" y="%.1f" class="fv" text-anchor="middle">%s</text>' % (tx, ty - 36, val))
        labels.append('<text x="%.1f" y="%.1f" class="fl" text-anchor="middle">%s</text>' % (tx, ty - 20, lab))
        bx, by = ISO.iso(x + 2, 4.9, 0)
        labels.append('<circle cx="%.1f" cy="%.1f" r="12" class="nb"/><text x="%.1f" y="%.1f" class="nbt">%d</text>' % (bx, by + 14, bx, by + 18.5, i + 1))
    items.sort(key=lambda z: z[0])
    (x1, y1), (x2, y2) = ISO.iso(-0.5, 5.6, 0), ISO.iso(4 * 9.0 + 4.5, 5.6, 0)
    arrow = '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="path"/>' % (x1, y1 + 6, x2, y2 + 6)
    body = ''.join(z[1] for z in items) + ''.join(labels)
    return '<svg class="iso" viewBox="-90 -185 680 590" role="img" aria-label="2027 acquisition funnel: %s installs from paid, %s new active users, %s monthly users in December, %s doctor reviews and %s paying families">%s%s</svg>' % (
        lakh(installs27) + ' lakh', lakh(Y27['paid'] + Y27['org']) + ' lakh', lakh(Y27['mauEnd']) + ' lakh', inr(Y27['rx']), inr(Y27['subsEnd']), arrow, body)

# ---- monthly channel chart ----
def chart():
    W, H, Lf, B, T = 980, 300, 46, 46, 16; n = 18; bw = (W - Lf - 10) / n; mx = 130
    Y = lambda v: T + (1 - v / mx) * (H - T - B)
    o = ['<svg viewBox="0 0 %d %d" role="img" aria-label="Marketing spend by channel, month by month, with new users from paid and from word of mouth">' % (W, H)]
    for v in (0, 40, 80, 120):
        o.append('<line x1="%d" x2="%d" y1="%.1f" y2="%.1f" stroke="var(--line)"/><text x="%d" y="%.1f" font-size="11" fill="var(--muted)" text-anchor="end">%d</text>' % (Lf, W - 10, Y(v), Y(v), Lf - 8, Y(v) + 4, v))
    o.append('<text x="%d" y="11" font-size="11" fill="var(--muted)">₹ lakh a month</text>' % Lf)
    for t in range(n):
        sp, _ = split(t); acc = 0; x = Lf + t * bw + 5
        for k, _, col in CH:
            v = sp[k][0] / L
            o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>' % (x, Y(acc + v), bw - 10, Y(acc) - Y(acc + v), col)); acc += v
        o.append('<text x="%.1f" y="%d" font-size="10.5" fill="var(--ink-2)" text-anchor="middle">%s</text>' % (x + (bw - 10) / 2, H - 28, MON[t % 12]))
        if t in (0, 12): o.append('<text x="%.1f" y="%d" font-size="10.5" font-weight="700" fill="var(--muted)">%s</text>' % (x, H - 12, '2027' if t == 0 else '2028'))
    for name, rng, _, _ in PH:
        x0 = Lf + rng[0] * bw; x1 = Lf + (rng[-1] + 1) * bw
        o.append('<line x1="%.1f" x2="%.1f" y1="%d" y2="%d" stroke="var(--accent)" stroke-width="2"/><text x="%.1f" y="%d" font-size="11" font-weight="650" fill="var(--accent-2)">%s</text>' % (x0 + 5, x1 - 5, H - 4, H - 4, x0 + 5, H - 8 + 0, ''))
    o.append('</svg>'); return ''.join(o)

def phasebar():
    out = []
    for name, rng, mix, _ in PH:
        out.append('<div style="flex:%d"><b>%s</b><span>%s to %s</span></div>' % (len(rng), name, mon(rng[0]), mon(rng[-1])))
    return '<div class="phasebar">' + ''.join(out) + '</div>'

def channel_table():
    rows = []
    for name, rng, mix, cac in PH:
        tot = {k: [0, 0] for k, _, _ in CH}
        for t in rng:
            sp, _ = split(t)
            for k in tot: tot[k][0] += sp[k][0]; tot[k][1] += sp[k][1]
        mk = sum(v[0] for v in tot.values()); us = sum(v[1] for v in tot.values())
        rows.append('<tr class="hl"><td>%s · %s to %s</td><td>₹%s L</td><td>100%%</td><td>₹%d</td><td>%s</td></tr>' % (name, mon(rng[0]), mon(rng[-1]), lakh(mk, 0), round(mk / us), inr(us)))
        for k, lab, col in CH:
            if not mix[k]: continue
            rows.append('<tr><td><i class="sw" style="background:%s"></i>%s</td><td>₹%s L</td><td>%d%%</td><td>₹%d</td><td>%s</td></tr>' % (col, lab, lakh(tot[k][0], 0), mix[k], cac[k], inr(tot[k][1])))
    return '<table><thead><tr><th>Phase and channel</th><th>Spend</th><th>Share</th><th>CAC ceiling</th><th>New active users</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table>'

def venues():
    items, labels = [], []
    V = [(0, 'campus', 'Campus', 'Ambassadors and codes'), (10, 'stay', 'Hotel, hostel, PG', 'A QR in every room'), (20, 'soc', 'Housing society', 'Health camp on a Sunday')]
    for x, kind, t1, t2 in V:
        items += ISO.prism(x, 0, 6, 6, 0.4, 0, 'p')
        if kind == 'campus':
            items += ISO.prism(x + 0.8, 1.0, 4.4, 2.2, 2.6, 0.4, 'w')
            items += ISO.prism(x + 0.6, 0.8, 4.8, 2.6, 0.4, 3.0, 'n')
            items += ISO.prism(x + 2.4, 3.2, 1.2, 0.05, 1.4, 0.4, 'a')
            for i in range(3): items += ISO.prism(x + 1.0 + i * 1.6, 4.4, 0.5, 0.5, 1.2, 0.4, 'a')
        elif kind == 'stay':
            items += ISO.prism(x + 1.0, 1.0, 4.0, 3.6, 4.2, 0.4, 'w')
            for r in range(3):
                for c in range(3): items += ISO.prism(x + 1.4 + c * 1.2, 4.6, 0.7, 0.05, 0.7, 1.0 + r * 1.2, 'a')
            items += ISO.prism(x + 4.4, 4.9, 0.9, 0.9, 0.9, 0.4, 'n')
        else:
            items += ISO.prism(x + 0.6, 0.6, 1.8, 1.8, 4.6, 0.4, 'w')
            items += ISO.prism(x + 3.4, 0.6, 1.8, 1.8, 3.6, 0.4, 'w')
            items += ISO.prism(x + 1.6, 3.4, 2.8, 1.8, 1.0, 0.4, 'a')
            items += ISO.prism(x + 1.5, 3.3, 3.0, 2.0, 0.25, 1.4, 'n')
        tx, ty = ISO.iso(x + 3, 3, 5.4)
        labels.append('<text x="%.1f" y="%.1f" class="fv" text-anchor="middle" style="font-size:22px">%s</text>' % (tx, ty - 26, t1))
        labels.append('<text x="%.1f" y="%.1f" class="fl" text-anchor="middle">%s</text>' % (tx, ty - 10, t2))
    items.sort(key=lambda z: z[0])
    return '<svg class="iso" viewBox="-120 -100 620 380" role="img" aria-label="Three offline venues: a campus with ambassadors, a hotel or PG with a QR code in every room, and a housing society hosting a health camp">' + ''.join(z[1] for z in items) + ''.join(labels) + '</svg>'

def ground_table():
    cols = [(2, 'Mar 2027'), (5, 'Jun 2027'), (8, 'Sep 2027'), (11, 'Dec 2027'), (17, 'Jun 2028')]
    O = {t: offline(t) for t, _ in cols}
    rows = [('Campus ambassadors', lambda o: inr(o['amb'])), ('Campuses', lambda o: inr(o['campuses'])), ('Users a month from campuses', lambda o: inr(o['camp_users'])),
            ('Rooms and beds with a QR', lambda o: inr(round(o['rooms'], -3))), ('Users a month from stays', lambda o: inr(o['stay_users'])),
            ('Society camps a month', lambda o: inr(o['camps'])), ('Users a month from camps', lambda o: inr(o['camps_users'])),
            ('Ground game spend a month', lambda o: '₹%s L' % lakh(o['camp_spend'] + o['stay_spend'] + o['camps_spend'])),
            ('Share of paid users that month', None)]
    head = '<thead><tr><th>From the plan</th>' + ''.join('<th>%s</th>' % l for _, l in cols) + '</tr></thead>'
    body = ''
    for lab, f in rows:
        if f is None:
            cells = ''.join('<td>%d%%</td>' % round((O[t]['camp_users'] + O[t]['stay_users'] + O[t]['camps_users']) / M[t]['paid'] * 100) for t, _ in cols)
            body += '<tr class="hl"><td>%s</td>%s</tr>' % (lab, cells)
        else:
            body += '<tr><td>%s</td>%s</tr>' % (lab, ''.join('<td>%s</td>' % f(O[t]) for t, _ in cols))
    return '<table>' + head + '<tbody>' + body + '</tbody></table>'

def month_table():
    rows = []
    for t, m in enumerate(M):
        cls = ' class="hl"' if t == 13 else ''
        rows.append('<tr%s><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (cls, mon(t), lakh(m['mkt'], 0), inr(m['paid']), inr(m['org']), lakh(m['mau'], 2), inr(m['subs']), inr(m['rxDay']), inr(m['corp']), inr(m['seats'])))
    return '<table><thead><tr><th>Month</th><th>Marketing, ₹ lakh</th><th>New users, paid</th><th>New users, word of mouth</th><th>Monthly users, lakh</th><th>Paying families</th><th>Doctor reviews a day</th><th>Companies signed</th><th>Employee seats</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table>'

def ue_table():
    rows = ''.join('<tr><td>%d</td><td>₹%s cr</td><td>%s lakh</td><td>%s lakh</td><td>₹%d</td><td>₹%d</td><td class="%s">%s</td><td>%s lakh</td></tr>' % (
        u['year'], cr(u['mkt']), lakh(u['paid']), lakh(u['org']), u['cac'], round(u['blended']), 'neg' if u['ltv'] < u['blended'] else 'pos', ('−₹%d' % round(-u['ltv'])) if u['ltv'] < 0 else ('₹%d' % round(u['ltv'])), lakh(u['mauEnd'])) for u in UE)
    return '<table><thead><tr><th>Year</th><th>Marketing</th><th>New users, paid</th><th>New users, word of mouth</th><th>Paid CAC</th><th>Blended CAC</th><th>Lifetime margin a user</th><th>Monthly users, Dec</th></tr></thead><tbody>' + rows + '</tbody></table>'

def lever(name, label, how, k):
    b, x = LV['base'], LV[k]
    du = x['mau13'] - b['mau13']
    users = ('<span>+%s</span> monthly users by Feb 2028<br>' % inr(du)) if du > 1 else 'Same users, more of them pay<br>'
    return '<div class="lev"><span class="lv">%s</span><b>%s</b><p>%s</p><div class="gain">%s<span>+%s</span> paying families by Feb 2028</div></div>' % (
        name, label, how, users, inr(x['subs13'] - b['subs13']))

css = re.search(r'<style>(.*?)</style>', (here.parent / 'cheeku-doctor' / 'template.html').read_text(), re.S).group(1)
extra = '''
.fv { font: 400 26px/1 var(--display); fill: var(--ink); } .fl { font-size: 11px; fill: var(--muted); font-weight: 600; }
.iso { max-height: 520px; min-width: 640px; }
.legend.five { grid-template-columns: repeat(5, minmax(0, 1fr)); } .legend p { margin: 0; }
@media (max-width: 760px) { .legend.five { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 8px; }
.key { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--ink-2); }
.phasebar { display: flex; gap: 4px; min-width: 760px; margin: 0 10px 0 46px; }
.phasebar div { background: var(--accent-soft); border-radius: 10px; padding: 8px 10px; display: grid; gap: 1px; min-width: 0; }
.phasebar b { font-size: 12.5px; color: var(--accent-2); } .phasebar span { font-size: 11px; color: var(--muted); white-space: nowrap; }
.icps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.icp { background: var(--soft); border-radius: 18px; padding: 16px; display: grid; gap: 8px; align-content: start; }
.icp.front { background: var(--navy); color: #fff; }
.icp .lv { font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); } .icp.front .lv { color: #C9C4FA; }
.icp h3 { font: 400 23px/1.08 var(--display); }
.icp p { font-size: 13px; line-height: 1.45; color: var(--ink-2); } .icp.front p { color: #D9D6FF; }
.icp .hook { font: italic 400 17px/1.25 var(--display); color: var(--accent-2); border-top: 1px solid var(--line); padding-top: 8px; } .icp.front .hook { color: #fff; border-color: rgba(255,255,255,.2); }
@media (max-width: 900px) { .icps { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (max-width: 520px) { .icps { grid-template-columns: minmax(0, 1fr); } }
.levs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.lev { background: var(--soft); border-radius: 18px; padding: 16px; display: grid; gap: 6px; align-content: start; }
.lev .lv { font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.lev b { font: 400 22px/1.1 var(--display); } .lev p { font-size: 13px; color: var(--ink-2); line-height: 1.45; }
.gain { font-size: 12.5px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 8px; line-height: 1.6; } .gain span { font-weight: 700; color: var(--safe); font-size: 14px; }
@media (max-width: 900px) { .levs { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (max-width: 520px) { .levs { grid-template-columns: minmax(0, 1fr); } }
.tiers { display: grid; gap: 8px; }
.tier { display: grid; grid-template-columns: 150px minmax(0, 1fr) 150px 130px; gap: 14px; align-items: center; background: var(--soft); border-radius: 14px; padding: 12px 16px; }
.tier b { font-size: 14.5px; } .tier span { font-size: 13px; color: var(--ink-2); line-height: 1.4; } .tier .n { font: 400 24px/1 var(--display); color: var(--accent); } .tier .pay { font-size: 12.5px; color: var(--muted); }
.tier.t1 { background: var(--navy); color: #fff; } .tier.t1 span { color: #D9D6FF; } .tier.t1 .n { color: #fff; } .tier.t1 .pay { color: #C9C4FA; }
@media (max-width: 760px) { .tier { grid-template-columns: minmax(0, 1fr) auto; } .tier span, .tier .pay { grid-column: 1 / -1; } }
.ramp { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; align-items: end; }
.ramp div { display: grid; gap: 6px; justify-items: center; } .ramp i { display: block; width: 100%; border-radius: 10px 10px 4px 4px; background: var(--accent); }
.ramp b { font: 400 24px/1 var(--display); } .ramp span { font-size: 12px; color: var(--muted); }
.splitbar { display: flex; height: 54px; border-radius: 14px; overflow: hidden; gap: 3px; }
.splitbar div { display: grid; align-content: center; padding: 0 14px; min-width: 0; } .splitbar b { font-size: 13.5px; } .splitbar span { font-size: 12px; opacity: .85; }
.b2b { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 760px) { .b2b { grid-template-columns: minmax(0, 1fr); } }
.gates { display: grid; gap: 8px; }
.gate { display: grid; grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; background: var(--soft); border-radius: 14px; padding: 12px 16px; font-size: 13.5px; }
.gate time { font-weight: 700; color: var(--accent-2); } .gate b { display: block; } .gate span { color: var(--ink-2); }
.gate .if { color: var(--warn); }
@media (max-width: 760px) { .gate { grid-template-columns: minmax(0, 1fr); } }
.cta2 { padding: 26px 32px 30px; display: grid; gap: 8px; border-top: 1px solid var(--line); }
.hero h1 { max-width: 24ch; }
.hookline { font: italic 400 clamp(22px, 3vw, 30px)/1.2 var(--display); color: var(--accent-2); }
.fine { font-size: 11.5px; color: var(--muted); max-width: 90ch; }
'''
key = '<div class="key">' + ''.join('<span><i class="sw" style="background:%s"></i>%s</span>' % (c, l) for _, l, c in CH) + '</div>'
b = LV['base']
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cheeku Acquisition Plan</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,400..750&display=swap">
<style>{css}{extra}</style>
</head>
<body>

<article class="sheet" aria-label="Sheet 1: the plan in one view">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Growth marketing · 1 / 4</span></div>
  <section class="hero">
    <h1>Customer acquisition plan. <em>Launch to Series A.</em></h1>
    <p class="hookline">"A licensed doctor for everyday illness. ₹49, about 20 minutes."</p>
    <p class="lede">That one line is the acquisition plan. A sick day is the most frequent health moment in an Indian family, so it is the cheapest moment to win them. We buy the first visit with paid ads, earn the second with creators families trust, and let the family file and its invites do the rest.</p>
    <div class="tags"><span class="tag v">Launch January 2027</span><span class="tag">Cheeku Doctor from February</span><span class="tag">Campuses, stays and societies from March</span><span class="tag">Same numbers as the financial model, base case</span></div>
    <div class="stats">
      <div class="stat"><b>{lakh(m13['mau'], 0)} lakh</b><span>monthly users by February 2028, when the Series A lands</span></div>
      <div class="stat"><b>₹{cr(seedMkt)} cr</b><span>marketing from the seed, December 2026 to January 2028</span></div>
      <div class="stat"><b>₹{SS['cac'][0]}</b><span>to win one active user from paid, 2027 ceiling</span></div>
      <div class="stat"><b>{inr(m13['subs'])}</b><span>paying families by February 2028</span></div>
    </div>
  </section>

  <section class="blk">
    <div class="k">The funnel, 2027</div>
    <h2>Five steps. <em>Each one has an owner and a number.</em></h2>
    <div class="isoWrap scroll">{funnel()}</div>
    <div class="legend five">
      <div><i>1</i><p><b>Installs</b><span>About {lakh(installs27)} lakh from paid, at roughly ₹40 each.</span></p></div>
      <div><i>2</i><p><b>Active in week one</b><span>One in three asks a question or adds a report. {lakh(Y27['paid'])} lakh from paid, {lakh(Y27['org'])} lakh from word of mouth.</span></p></div>
      <div><i>3</i><p><b>Still here in December</b><span>{lakh(Y27['mauEnd'])} lakh monthly users, after {round(SS['churn'][0]*100)}% monthly churn.</span></p></div>
      <div><i>4</i><p><b>Doctor reviews</b><span>{inr(Y27['rx'])} in the year, {inr(Y27['rxDayEnd'])} a day by December.</span></p></div>
      <div><i>5</i><p><b>Paying families</b><span>{inr(Y27['subsEnd'])} on Solo or Family in December.</span></p></div>
    </div>
    <p class="cap">Steps 2 to 5 are the financial model's base case. Installs and the one-in-three activation rate are our planning estimates behind the model's ₹{SS['cac'][0]} per active user; the first four weeks of spend replace them with measured numbers.</p>
  </section>

  <section class="blk">
    <div class="k">Four levers</div>
    <h2>What moves the plan, <em>and by how much.</em></h2>
    <div class="levs">
      {lever('Lever 1 · cost', 'CAC ₹120 to ₹102', 'Creators and referral take share from ads. 15% cheaper users, same budget.', 'cac')}
      {lever('Lever 2 · retention', 'Churn 12% to 10%', 'The daily plan, due reminders and a doctor on sick days give a reason to return.', 'churn')}
      {lever('Lever 3 · word of mouth', 'Organic 14% to 16%', 'Family invites, prescription share cards and report-decode forwards on WhatsApp.', 'organic')}
      {lever('Lever 4 · paying share', 'Conversion up 20%', 'Sick-day users who got help subscribe. More doctor reviews, more plans.', 'conv')}
    </div>
    <p class="cap">Each lever is run through the financial model on its own against the base case. If paid CAC runs 40% over plan (₹168), monthly users by February 2028 fall to {lakh(LV['cacBad']['mau13'])} lakh; the gates on sheet 4 are there to catch that in weeks, not quarters.</p>
  </section>
</article>

<article class="sheet" aria-label="Sheet 2: who, where and how much">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Growth marketing · 2 / 4</span></div>

  <section class="blk" style="border-top:0">
    <div class="k">Who we go after</div>
    <h2>One person runs the family's health. <em>We meet them on a bad day.</em></h2>
    <div class="icps">
      <div class="icp front"><span class="lv">Front door · everyone</span><h3>The sick-day searcher</h3><p>Fever, cold, acidity at 10 pm. Today they ask the chemist or search online. Highest frequency, lowest trust in what is on offer.</p><p class="hook">"A licensed doctor for everyday illness. ₹49, about 20 minutes."</p></div>
      <div class="icp"><span class="lv">Wedge 1</span><h3>Expecting and new parents</h3><p>About 80 lakh urban births a year. Daily questions, high spend, a new report every month.</p><p class="hook">"Week 20, sudden pain, next appointment Tuesday. Ask Cheeku now."</p></div>
      <div class="icp"><span class="lv">Wedge 2</span><h3>Caregivers of parents</h3><p>Diabetes, BP, heart. One adult child manages three doctors' prescriptions over WhatsApp.</p><p class="hook">"Send Papa's prescription. 10 checks, in a minute, free."</p></div>
      <div class="icp"><span class="lv">Wedge 3</span><h3>Women's health</h3><p>Periods, PCOS, thyroid. Reports scattered across clinics, questions they would rather not ask in person.</p><p class="hook">"Every report in one file. Read in plain Hindi or English."</p></div>
    </div>
    <p class="cap">Launch cities follow doctor capacity: the ₹49 hook runs only where Cheeku Doctor is live (one pilot city from February, more from April). Everywhere else the lead hook is the free report decode and the prescription check.</p>
  </section>

  <section class="blk">
    <div class="k">Spend, month by month</div>
    <h2>Agency first. <em>Creators and the ground game by summer.</em></h2>
    <div class="box scroll">{key}{chart()}{phasebar()}</div>
    <div class="scroll">{channel_table()}</div>
    <p class="cap">Total spend each month is the financial model's marketing line: ₹{SS['mktBudget'][0]} lakh a month in 2027, ₹{SS['mktBudget'][1]} lakh a month from January 2028 (the Series A lands in February), plus ₹20 lakh before launch in December 2026. Channel shares and CAC ceilings are our plan; in every phase they blend to the model's cost per active user (₹{SS['cac'][0]} in 2027, ₹{SS['cac'][1]} in 2028).</p>
  </section>

  <section class="blk">
    <div class="k">January to March · the agency sprint</div>
    <h2>Rent the paid engine. <em>Own the data.</em></h2>
    <div class="grid3">
      <div class="box"><h3>What the agency runs</h3><ul><li>Meta and Google app campaigns, Android first</li><li>40 to 60 new creatives a month, Hindi and English</li><li>Weekly creative and audience tests</li><li>Fee inside the performance line, about 10% of managed spend</li></ul></div>
      <div class="box"><h3>What stays with us</h3><ul><li>Ad accounts, pixels and the attribution tool are ours from day one</li><li>Every script is cleared by our clinical lead</li><li>Activation is the target, not installs: paid on cost per active user</li><li>90-day contract, weekly review, exit at 30 days' notice</li></ul></div>
      <div class="box"><h3>What we learn by March</h3><ul><li>Real cost per install and per active user, by city and language</li><li>The three hooks that work, out of about 150 tested</li><li>Which ICP activates and stays</li><li>Whether the ₹49 doctor hook beats the free report decode</li></ul></div>
    </div>
    <p class="cap">December's ₹20 lakh pays for the waitlist, the first 30 creators' content bank, store listing work, agency onboarding and about ₹5 lakh of test spend, so January starts with tested creatives.</p>
  </section>
</article>

<article class="sheet" aria-label="Sheet 3: creators, loops and B2B">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Growth marketing · 3 / 4</span></div>

  <section class="blk" style="border-top:0">
    <div class="k">The creator army</div>
    <h2>Hundreds of small voices <em>beat one big one.</em></h2>
    <p class="lede">The consumer AI apps that grew fastest, Cal AI among them, did it with many small creators posting short videos and paid on results. Health needs one more thing: trust. So doctors lead and everyday creators carry it.</p>
    <div class="tiers">
      <div class="tier t1"><b>Doctor voices</b><span>MBBS and MD creators explain everyday illness and reports. They teach; they do not endorse. Retainer, qualifications shown.</span><span class="n">10 → 25</span><span class="pay">₹40k to ₹1 lakh a month</span></div>
      <div class="tier"><b>Micro creators</b><span>10k to 1 lakh followers: mothers, caregivers, fitness, regional language. Real use on camera: decode a report, check Papa's prescription.</span><span class="n">50 → 300</span><span class="pay">₹3k to ₹8k a video, plus ₹30 per active user</span></div>
      <div class="tier"><b>Affiliate army</b><span>Students, homemakers, pharmacists with a personal code. No fee, paid only on results. The long tail that keeps CAC falling.</span><span class="n">0 → 1,000</span><span class="pay">₹25 to ₹40 per active user</span></div>
      <div class="tier"><b>Launch spikes</b><span>A few large family and health channels for launch week and Cheeku Doctor's city launches.</span><span class="n">3 to 5</span><span class="pay">₹3 to ₹6 lakh each, from the brand line</span></div>
    </div>
    <div class="grid2">
      <div class="box"><h3>Active creators and affiliates</h3>
        <div class="ramp"><div><b>30</b><i style="height:10px"></i><span>Dec '26</span></div><div><b>100</b><i style="height:22px"></i><span>Mar '27</span></div><div><b>300</b><i style="height:48px"></i><span>Jun '27</span></div><div><b>700</b><i style="height:92px"></i><span>Sep '27</span></div><div><b>1,300</b><i style="height:150px"></i><span>Dec '27</span></div></div>
        <p class="cap">Our hiring targets for the programme. Paid from the creator line: ₹8 lakh a month in the launch phase, ₹14 lakh from April.</p></div>
      <div class="box"><h3>How it runs</h3><ul><li>The growth lead runs it from the launch quarter; a dedicated creator lead joins by August. A creator portal gives codes, briefs and weekly payouts</li><li>One brief a week, three proven hooks, creators film it their way</li><li>Top 10% of videos become paid ads the same week</li><li>Every health claim comes from a script bank signed by our clinical lead</li><li>Paid partnership labels on every post, as ASCI requires</li></ul></div>
    </div>
  </section>

  <section class="blk">
    <div class="k">The ground game, from March 2027</div>
    <h2>Meet people where they get sick. <em>Pay only when it works.</em></h2>
    <p class="lede">Three offline channels, opened through our own networks. Students away from home and travellers in a strange city are the sick-day user at their most alone; housing societies are where whole families decide together.</p>
    <div class="isoWrap scroll">{venues()}</div>
    <div class="grid3">
      <div class="box"><h3>Campus ambassadors</h3><p>Colleges and universities in the metros, starting with campuses the founders know. Three ambassadors per campus run hostel drives, sick-bay posters and fest stalls.</p>
        <ul><li>₹10k to ₹20k a month each (₹15k average), against a floor of 100 activated users</li><li>Plus ₹10 to ₹20 per user who joins with their code and buys a Sick Day Pass, a plan or a care booking</li><li>Cost cap: ₹{PH[1][3]['campus']} per active user</li></ul></div>
      <div class="box"><h3>QR in every room</h3><p>Hotel chains, hostels and PG networks put a card by the bed: "Unwell? A licensed doctor for ₹49, about 20 minutes. Or ask Cheeku about your reports."</p>
        <ul><li>We pay printing, placement and ₹20 per activated guest</li><li>The property earns 10% of the commerce its guests bring for 12 months: doctor reviews, medicines, tests</li><li>Cost cap: ₹{PH[1][3]['stays']} per active user. Assumes one active user per room every 17 months</li></ul></div>
      <div class="box"><h3>Society health camps</h3><p>Weekend camps in gated societies through NoBroker and MyGate: BP, sugar and BMI checks, a doctor's talk, the family file set up on the spot.</p>
        <ul><li>About ₹20,000 a camp: doctor, kit, society fee</li><li>The lab partner runs the free checks for its bookings</li><li>About 65 families activated per camp; cost cap ₹{PH[1][3]['camps']} per active user, our dearest channel and our best payers</li></ul></div>
    </div>
    <div class="scroll">{ground_table()}</div>
    <p class="cap">All from the plan's channel split, inside the model's marketing line: nothing is added to spend. Ambassador fees, room and camp yields are our planning estimates; March is a pilot in two cities and each channel scales only if it holds its cost cap for a month. Partner revenue shares come out of the commerce they bring, never ahead of it.</p>
  </section>

  <section class="blk">
    <div class="k">Loops that cost nothing</div>
    <h2>{lakh(Y27['org'])} lakh users in 2027 <em>arrive without an ad.</em></h2>
    <div class="grid3">
      <div class="box"><h3>Family invite</h3><p>The Family plan needs the family. Adding a parent or partner sends an invite; each family brings two to four people.</p></div>
      <div class="box"><h3>Share cards</h3><p>A decoded report, a prescription check score, a doctor's prescription: each ends in a card built to forward on WhatsApp.</p></div>
      <div class="box"><h3>Referral credit</h3><p>Give a free doctor review, get one. Costs us about ₹40 when used, against ₹{SS['cac'][0]} for a paid user.</p></div>
    </div>
    <p class="cap">The model counts word of mouth as {round(SS['organic'][0]*100)}% of last month's users joining each month in 2027. The referral line (5% to 15% of spend) pays for the credits.</p>
  </section>

  <section class="blk">
    <div class="k">B2C and B2B</div>
    <h2>Consumers first. <em>Employers once we pass 1 lakh users.</em></h2>
    <div class="splitbar" role="img" aria-label="Acquisition spend to January 2028: consumer marketing ₹{cr(seedMkt)} crore, employer sales ₹{lakh(sum(m['corpSales'] for m in M[:13]), 0)} lakh">
      <div style="flex:{seedMkt/L:.0f};background:var(--accent);color:#fff"><b>B2C marketing</b><span>₹{cr(seedMkt)} cr to Jan '28</span></div>
      <div style="flex:{max(60, sum(m['corpSales'] for m in M[:13])/L):.0f};background:var(--navy);color:#fff"><b>B2B</b><span>₹{lakh(sum(m['corpSales'] for m in M[:13]), 0)} L</span></div>
    </div>
    <div class="b2b">
      <div class="box"><h3>Employers, direct</h3><p>Starts {mon(4)}, two months after consumer users pass 1 lakh. Deepesh leads; the first account executive joins mid-2027.</p><ul><li>{SS['corpClients'][0]} companies a month in year one, {SS['corpClients'][1]} in year two</li><li>About ₹{inr(SS['corpCac'])} to win one: demos, a wellness talk, onboarding, plus {round(SS['corpCommission']*100)}% commission</li><li>Employees get Family at {round(SS['corpDiscount']*100)}% off</li></ul></div>
      <div class="box"><h3>HR benefits platforms</h3><p>Listed in flexible-benefits and group-insurance catalogues, which keep a share of each sale.</p><ul><li>{SS['hr'][0]} platforms live in the first year, {SS['hr'][1]} in the second</li><li>No upfront cost: they earn only when a plan is sold</li></ul></div>
      <div class="box"><h3>Gifting</h3><p>Year-long Family plans bought in bulk, mostly for Diwali. Paid up front.</p><ul><li>{inr(SS['gift'][0])} plans in the first year, {inr(SS['gift'][1])} in the second</li><li>Sold by the same employer team</li></ul></div>
    </div>
    <div class="scroll"><table><thead><tr><th>B2B, from the model</th><th>Dec 2027</th><th>Jun 2028</th><th>Dec 2028</th></tr></thead><tbody>
      <tr><td>Companies signed</td><td>{inr(M[11]['corp'])}</td><td>{inr(M[17]['corp'])}</td><td>{inr(Y28['corpEnd'])}</td></tr>
      <tr><td>Employee seats</td><td>{inr(M[11]['seats'])}</td><td>{inr(M[17]['seats'])}</td><td>{inr(Y28['seatsEnd'])}</td></tr>
      <tr><td>Active users from employers</td><td>{inr(M[11]['mauCorp'])}</td><td>{inr(M[17]['mauCorp'])}</td><td>{inr(Y28['seatsEnd']*1.3)}</td></tr>
      <tr><td>Share of all monthly users</td><td>{M[11]['mauCorp']/M[11]['mau']*100:.1f}%</td><td>{M[17]['mauCorp']/M[17]['mau']*100:.1f}%</td><td>{Y28['seatsEnd']*1.3/Y28['mauEnd']*100:.1f}%</td></tr>
      <tr><td>Employer sales cost in the year</td><td>₹{lakh(Y27['corpSales'], 0)} L</td><td></td><td>₹{lakh(Y28['corpSales'], 0)} L</td></tr>
      <tr><td>Employer revenue in the year</td><td>₹{cr(Y27['rCorp'])} cr</td><td></td><td>₹{cr(Y28['rCorp'])} cr</td></tr>
    </tbody></table></div>
    <p class="cap">B2B is small in users and large in trust: an employer's name on the plan is the cheapest proof a family can get. Insurers come later; the model's first paid insurer contract is in 2029, with an unpaid wellness pilot before the Series A. Partner pharmacies and labs carry a QR for the ₹49 doctor at the counter, funded from the brand line.</p>
  </section>
</article>

<article class="sheet" aria-label="Sheet 4: numbers, gates and team">
  <div class="pagehead"><span class="logo">Cheeku</span><span>Growth marketing · 4 / 4</span></div>

  <section class="blk" style="border-top:0">
    <div class="k">Month by month</div>
    <h2>The plan the seed pays for, <em>in one table.</em></h2>
    <div class="scroll">{month_table()}</div>
    <p class="cap">Financial model, base case. The highlighted row is February 2028, the month the Series A is due: {lakh(m13['mau'], 1)} lakh monthly users and {inr(m13['subs'])} paying families, the milestones on our ask. By then {lakh(paid13)} lakh users have come from paid and {lakh(org13)} lakh from word of mouth.</p>
  </section>

  <section class="blk">
    <div class="k">Does it pay back</div>
    <h2>Not in year one. <em>From 2029, clearly.</em></h2>
    <div class="scroll">{ue_table()}</div>
    <p class="cap">Lifetime margin is gross profit per active user a month divided by monthly churn. In 2027 and 2028 a user costs more than they return: care bookings and plans are still ramping, and we are buying the family file. From 2029 a user returns more than twice the blended cost, and by 2031 more than six times. Blended CAC counts every new user, paid or not.</p>
  </section>

  <section class="blk">
    <div class="k">Gates</div>
    <h2>We check weekly. <em>We move money when a number misses.</em></h2>
    <div class="gates">
      <div class="gate"><time>Week 4</time><div><b>Install to active at 30% or better; cost per active user under ₹150</b></div><span class="if">If not: pause the bottom half of creatives, move the lead hook to whichever of doctor or report decode activates better.</span></div>
      <div class="gate"><time>March pilot</time><div><b>10 campuses and 30 ambassadors live in two cities; one stays partner; 8 society camps</b></div><span class="if">Each offline channel scales only after a month inside its cost cap. If ambassadors miss 100 users each, drop to the top half and cut the fee to the ₹10k floor.</span></div>
      <div class="gate"><time>End of March</time><div><b>Blended paid CAC at ₹120; 100 active creators; day-30 retention at 30%</b></div><span class="if">If CAC is over ₹150 for three weeks: cut performance by 20% and move it to the hero campaign and referral credits.</span></div>
      <div class="gate"><time>End of June</time><div><b>Creators bring a third of paid users at ₹110 or less; agency contract reviewed</b></div><span class="if">If creators cost more than ads: keep the top 20%, stop the rest, hold the agency another quarter.</span></div>
      <div class="gate"><time>End of September</time><div><b>Word of mouth matches paid, month for month; first 15 employers signed</b></div><span class="if">If word of mouth lags: double the referral credit and test a free first doctor review for invited family.</span></div>
      <div class="gate"><time>February 2028</time><div><b>{lakh(m13['mau'], 0)} lakh monthly users, {inr(m13['subs'])} paying families, {inr(m13['rxDay'])} doctor reviews a day</b></div><span class="if">These are the Series A milestones. Marketing has already stepped up to ₹{SS['mktBudget'][1]} lakh a month from January.</span></div>
    </div>
    <p class="cap">Weekly dashboard: cost per install, install to active, cost per active user by channel, day-1, day-7 and day-30 retention, doctor reviews a day and wait time, share of new users from word of mouth. If runway falls under six months the model's defence plan cuts marketing by 65%.</p>
  </section>

  <section class="blk">
    <div class="k">Team and guardrails</div>
    <div class="grid2">
      <div class="box"><h3>Who runs it</h3><ul><li><b>Athar</b> owns growth until the growth lead joins in the launch quarter</li><li><b>Agency</b> runs paid from December to at least June</li><li><b>Creator lead</b> second hire; content and community lead third</li><li><b>Performance marketer</b> joins in 2028 and brings paid in-house</li><li><b>Deepesh</b> runs employers, benefits platforms, pharmacy partners, and the university, stays and society deals</li><li><b>Campus lead</b>, a contractor paid from the campus line, runs ambassadors until the partnerships manager joins</li><li>Growth team: {M[11]['growthHc']:.0f} people by December 2027, {M[17]['growthHc']:.0f} by June 2028, as in the model</li></ul></div>
      <div class="box"><h3>What we will not do</h3><ul><li>No cure or guarantee claims; no before and after</li><li>Doctors explain, they do not endorse; qualifications shown on every post</li><li>No ₹49 doctor ads in a city before the doctors are live there</li><li>No antibiotics or controlled drugs, so no ads that imply them</li><li>Paid partnerships labelled; health data never used for ad targeting</li><li>A written legal opinion on advertising a doctor review before the first doctor ad runs</li></ul></div>
    </div>
  </section>

  <div class="cta2">
    <p class="fine">Sources and basis: Cheeku financial model v2, base case (marketing, cost per active user, word of mouth, churn, users, paying families, doctor reviews, employer numbers). Channel shares, channel CAC ceilings, install and activation rates, creator counts and fees, ambassador fees, room yields and camp costs are our planning estimates and are replaced by measured numbers from the first weeks of spend. Projections are not guarantees. Confidential. November 2026.</p>
  </div>
</article>

</body>
</html>
'''
assert '—' not in html
(here / 'acquisition-plan.html').write_text(html)
print(len(html))
