"""Screen the uploaded investor lists against Cheeku's raise.

Cheeku: pre-revenue consumer health AI for Indian families, ₹26 cr seed (about $3M),
Jan 2027, Gurgaon. Fit = stage (seed / pre-A / angel) x thesis (health, then consumer
and AI) x signal from portfolio. Everything here is read from the lists; nothing is
looked up. Each record keeps why it scored as it did.
"""
import json, re, collections, sys

d = json.load(open(sys.argv[1]))
nm = lambda s: re.sub(r"[^a-z0-9]", "", (s or "").lower())

HEALTH_WORDS = r"health|wellness|medical|medtech|med-tech|hospital|diagnostic|fitness|clinic|doctor|patient|longevity|care ?tech|nutrition|mental|pharmacy|healthcare"
HEALTH_COS = [
    "practo", "pharmeasy", "1mg", "netmeds", "medlife", "mfine", "healthplix", "innovaccer", "cure.fit", "curefit", "cult.fit",
    "healthifyme", "portea", "medikabazaar", "pristyn", "qure", "sigtuple", "niramai", "lybrate", "docsapp", "medibuddy",
    "ultrahuman", "eka care", "even healthcare", "truemeds", "healthians", "redcliffe", "thyrocare", "sugar.fit", "beato",
    "phable", "dozee", "wysa", "innerhour", "amaha", "babychakra", "mylo", "healthkart", "nephroplus", "cloudnine",
    "visit health", "loop health", "plum", "onsurity", "orange health", "tricog", "cardiotrack", "ekincare", "goqii",
    "doctor insta", "gympik", "zoojoo", "affordplan", "mediassist", "medi assist", "1 mg", "myupchar", "zeno health",
    "credihealth", "docprime", "medcords", "connect and heal", "bookmyshow health", "toffee insurance", "acko", "ditto",
    "lenskart", "mamaearth", "oziva", "wellbeing nutrition", "cure fit", "fitpass", "healthassure", "medulance",
    "pillbox", "medpay", "zyla", "lissun", "mykare", "allo health", "inito", "doxper",
]
CONSUMER_WORDS = r"consumer|b2c|mobile|internet|ai\b|artificial intelligence|machine learning|deep ?tech|vernacular|bharat|india-first|subscription|marketplace|edtech|social"
CONSUMER_COS = [
    "rapido", "unacademy", "meesho", "sharechat", "dailyhunt", "cred", "swiggy", "zomato", "ola", "oyo", "nykaa", "dunzo",
    "urban company", "urbanclap", "zepto", "lenskart", "boat", "mamaearth", "sugar", "licious", "byju", "vedantu", "khatabook",
    "jupiter", "slice", "koo", "kuku fm", "pratilipi", "frontier", "sarvam", "krutrim", "glance", "inmobi", "verloop", "haptik",
    "yellow.ai", "niki.ai", "arya.ai", "sirion", "fynd", "pepperfry", "furlenco", "milkbasket", "bigbasket", "grofers",
    "blinkit", "faasos", "rebel foods", "cars24", "cardekho", "spinny", "droom", "little black book", "lbb", "popxo", "babychakra",
]
SEED_WORDS = r"seed|pre-?series|pre series|angel|idea stage|early[- ]stage|early stage|startup|incubat|accelerat|pre-?seed|first cheque|first check"
LATE_WORDS = r"private equity|growth capital|mid-?market|buyout|late[- ]stage|pre-ipo|investment banking|asset management|middle market|growth stage"
NEG_SECTORS = r"real estate|agri|agriculture|clean ?tech|climate|energy|manufactur|infrastructure|venture debt|debt|nbfc|lending|sme|crypto|blockchain|logistics|b2b saas|enterprise software|semiconductor|media and entertainment|gaming"
ACCEL_WORDS = r"accelerat|incubat|programme|program\b|cohort|venture studio|launchpad"

# Known renames and status (as of Oct 2026, from public record, not from the lists)
RENAMES = {
    "sequoiaindia": "Now Peak XV Partners (renamed 2023)",
    "sequoiacapitalindia": "Now Peak XV Partners (renamed 2023)",
    "matrixpartners": "India arm now Z47 (renamed 2024)",
    "matrixpartnersindia": "India arm now Z47 (renamed 2024)",
    "idgventuresindia": "Now Chiratae Ventures",
    "helioncapital": "Helion stopped new investing in 2020",
    "helionventurepartners": "Helion stopped new investing in 2020",
    "saifpartners": "Now Elevation Capital",
    "nexusventurepartners": "",
}
DECEASED = {"ratantata": "Ratan Tata died in October 2024", "rakeshjhunjhunwala": "Rakesh Jhunjhunwala died in August 2022"}
NOTES = {
    "rajananandan": "Managing Director at Peak XV since 2019; also reachable through Peak XV's Surge programme",
    "sachinbansal": "Runs Navi; angel cheques are rarer now",
    "vijayshekharsharma": "Paytm founder; mostly invests through Paytm-linked vehicles",
}


def hits(text, cos):
    t = (text or "").lower()
    return [c for c in cos if c in t]


def screen_fund(name, text, portfolio, kind_hint, stage_hint):
    reasons, flags = [], []
    blob = " ".join([text or "", stage_hint or "", kind_hint or ""]).lower()
    h_words = bool(re.search(HEALTH_WORDS, (text or "").lower()))
    h_port = hits(portfolio, HEALTH_COS)
    c_words = bool(re.search(CONSUMER_WORDS, (text or "").lower()))
    c_port = hits(portfolio, CONSUMER_COS)
    seed = bool(re.search(SEED_WORDS, blob))
    late = bool(re.search(LATE_WORDS, blob))
    neg = re.findall(NEG_SECTORS, (text or "").lower())
    head = ((text or "")[:140] + " " + (kind_hint or "")).lower()
    accel = bool(re.search(r"accelerat|incubat|accelar", head)) and not re.search(r"venture capital firm|venture fund|private equity", head)

    score = 20
    if seed: score += 25; reasons.append("invests at seed or early stage")
    if late and not seed: score -= 35; reasons.append("growth, PE or late stage only")
    elif late: score -= 5
    if h_words: score += 25; reasons.append("health or wellness in its thesis")
    if h_port: score += 20 + min(10, 3 * len(h_port)); reasons.append("health portfolio: " + ", ".join(sorted(set(h_port))[:4]))
    if c_words: score += 8; reasons.append("consumer, mobile or AI focus")
    if c_port: score += 7 + min(6, 2 * len(c_port)); reasons.append("consumer portfolio: " + ", ".join(sorted(set(c_port))[:4]))
    if neg and not (h_words or h_port):
        score -= 15 if seed else 25; reasons.append("sector focus elsewhere: " + ", ".join(sorted(set(neg))[:3]))
    if "venture debt" in blob or kind_hint.lower().startswith("venture debt"):
        score -= 40; flags.append("Venture debt, not equity")
    if any(x in (portfolio or "").lower() for x in ("healthifyme", "eka care", "practo")):
        flags.append("Backs a company close to Cheeku: check for conflict")
    score = max(0, min(100, score))
    return score, reasons, flags, accel


def tier(score, excluded):
    if excluded: return "Out"
    if score >= 70: return "A"
    if score >= 50: return "B"
    if score >= 35: return "C"
    return "Out"


out = {}  # key -> record


ALIAS = {"sequoiaindia": "sequoiacapitalindia", "inventusindia": "inventuscapitalpartners", "stellarisventurepartners": "stellarisventures", "matrixpartnersindia": "matrixpartners", "accel": "accelpartners"}
def put(rec):
    k = nm(rec["name"]); k = ALIAS.get(k, k)
    if k in out:  # merge: keep the richer record, union sources and contacts
        o = out[k]
        o["sources"] = sorted(set(o["sources"]) | set(rec["sources"]))
        for f in ("email", "linkedin", "website", "twitter", "city", "portfolio", "about", "stageFocus"):
            if not o.get(f) and rec.get(f): o[f] = rec[f]
        o["people"] = o.get("people", []) + [p for p in rec.get("people", []) if p not in o.get("people", [])]
        if rec["fit"] > o["fit"]:
            for f in ("fit", "tier", "why", "kind"): o[f] = rec[f]
        o["flags"] = sorted(set(o["flags"]) | set(rec["flags"]))
    else:
        out[k] = rec


# List A: 99 funds with type, stage, city and partner emails
for f in d["A"]:
    kind_hint = f["type"].replace("Accelarator", "Accelerator")
    stage = f["stage"].replace("\n", " ")
    sc, why, flags, accel = screen_fund(f["name"], "", "", kind_hint, stage)
    kind = "Accelerator" if re.search("Accelerator|Incubator", kind_hint) else ("Angel network" if "Angel Network" in kind_hint else ("Platform" if "Fundraising Platform" in kind_hint else "VC"))
    if "Corporate VC" in kind_hint: flags.append("Corporate VC")
    excluded = sc < 35 or "Venture debt, not equity" in flags
    put(dict(name=f["name"], kind=kind, city=" ".join(f["loc"].split()), stageFocus=stage, about=kind_hint,
             people=[c for c in f["contacts"] if c["name"] or c["email"]], email=next((c["email"] for c in f["contacts"] if c["email"]), ""),
             fit=sc, tier=tier(sc, excluded), why=why, flags=flags, sources=["investors.xlsx"]))

# List B: 177 funds with an about line and portfolio
for f in d["B"]:
    sc, why, flags, accel = screen_fund(f["name"], f["about"], f["portfolio"], "", "")
    kind = "Accelerator" if accel and re.search(r"accelerat|incubat", f["about"].lower()) else "VC"
    if re.search(r"angel (investment )?network", f["about"].lower()): kind = "Angel network"
    if re.search(r"investment bank|asset management|financial services company|nbfc", f["about"].lower()): sc -= 20; why.append("a financial services firm, not a seed fund")
    sc = max(0, sc)
    put(dict(name=f["name"], kind=kind, about=f["about"], portfolio=f["portfolio"] if f["portfolio"] != "NA" else "",
             website=f["web"], email=f["email"] if f["email"] not in ("NA", "") else "", people=[],
             fit=sc, tier=tier(sc, sc < 35), why=why, flags=flags, sources=["investor.xlsx (VC funds)"]))

# List C: 193 active angels with portfolios
for a in d["C"]:
    p = a["portfolio"]
    h, c = hits(p, HEALTH_COS), hits(p, CONSUMER_COS)
    sc = 45 + (25 + min(15, 5 * len(h)) if h else 0) + (8 + min(10, 3 * len(c)) if c else 0)
    why = ["active angel with a listed portfolio"]
    if h: why.append("health portfolio: " + ", ".join(sorted(set(h))[:4]))
    if c: why.append("consumer portfolio: " + ", ".join(sorted(set(c))[:4]))
    flags = ["Backs a company close to Cheeku: check for conflict"] if any(x in p.lower() for x in ("healthifyme", "eka care", "practo")) else []
    li = a["linkedin"]; li = ("https://" + li) if li and not li.startswith("http") else li
    tw = a["twitter"]; tw = tw if tw.startswith("http") or not tw else "https://twitter.com/" + tw.lstrip("@")
    sc = min(100, sc)
    put(dict(name=a["name"], kind="Angel", portfolio=p, linkedin=li, twitter=tw, people=[], email="",
             fit=sc, tier=tier(sc, False), why=why, flags=flags, sources=["investor.xlsx (active angels)"]))

# List D: 990 angels, name, city and contacts only. Screened only where they match list C.
pool = []
for a in d["D"]:
    k = nm(a["name"])
    rec = dict(name=a["name"], city="" if a["city"] == "-" else a["city"], email=a["email"], linkedin=a["linkedin"],
               sources=["Angel_investors_India_999_Paid_list.xlsx"])
    if k in DECEASED:
        pool.append(dict(rec, status="Out", reason=DECEASED[k])); continue
    if k in out:
        put(dict(rec, kind="Angel", people=[], fit=out[k]["fit"], tier=out[k]["tier"], why=out[k]["why"], flags=[]))
    else:
        pool.append(dict(rec, status="Unscreened", reason="Name and contact only: check LinkedIn for health or consumer bets before reaching out"))

KIND_FIX = {"sequoiacapitalindia": "VC", "sequoiaindia": "VC", "indiainternetfund": "VC", "indiaquotient": "VC", "guildcapital": "VC",
            "seedersventurecapital": "VC", "peeshventurecapital": "VC", "cioangelnetwork": "Angel network", "villgro": "Accelerator", "hyderabadangels": "Angel network", "chennaiangels": "Angel network",
            "indianangelnetwork": "Angel network", "letsventure": "Platform", "mumbaiangels": "Angel network", "ventureCatalysts": "Angel network"}
# Funds we know write seed cheques into Indian consumer or health companies. From general knowledge, not the lists: verify before relying on it.
KNOWN_SEED = {"accelpartners", "accel", "accelindia", "elevationcapital", "saifpartners", "blumeventures", "lightspeedventurepartners",
              "lightspeedindia", "kalaaricapital", "chirataeventures", "idgventuresindia", "3one4capital", "stellarisventures",
              "primeventurepartners", "indiaquotient", "matrixpartners", "matrixpartnersindia", "nexusventurepartners",
              "sequoiacapitalindia", "sequoiaindia", "sequoiasurge", "omidyarnetwork", "omidyarnetworkindia", "titancapital",
              "inflectionpointventures", "letsventure", "indianangelnetwork", "mumbaiangels", "venturecatalysts", "100xvc",
              "endiyapartners", "firesideventures", "saamacapital", "kaecapital", "beenext", "orioscapital", "w health ventures",
              "whealthventures", "bettercapital", "antlerindia", "antler", "ycombinator", "entrepreneurfirst", "techstars"}
for k, r in out.items():
    if k in KIND_FIX: r["kind"] = KIND_FIX[k]
    if k == "venturecatalysts": r["kind"] = "Angel network"
    if k in KNOWN_SEED and r["tier"] != "Out":
        r["fit"] = min(100, r["fit"] + 15); r["why"].append("known for seed cheques in Indian consumer or health (our knowledge, verify)")
        r["tier"] = tier(r["fit"], False)
    if k in DECEASED: r["tier"] = "Out"; r["why"] = [DECEASED[k]]
    if "Venture debt, not equity" in r["flags"]: r["tier"] = "Out"; r["why"].append("venture debt, not equity")
    if k in NOTES: r["flags"] = sorted(set(r["flags"]) | {NOTES[k]})
    if k in RENAMES and RENAMES[k]: r["flags"] = sorted(set(r["flags"]) | {RENAMES[k]})
    if "stopped new investing" in " ".join(r["flags"]): r["tier"] = "Out"; r["why"].append("no longer investing")

recs = sorted(out.values(), key=lambda r: -r["fit"])
targets = [r for r in recs if r["tier"] != "Out"]
dropped = [r for r in recs if r["tier"] == "Out"]
json.dump(dict(targets=targets, dropped=dropped, pool=pool), open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
cnt = collections.Counter((r["kind"], r["tier"]) for r in recs)
for k in sorted(cnt): print(k, cnt[k])
print("targets", len(targets), "dropped", len(dropped), "pool", len(pool))
for r in targets[:40]: print(r["tier"], r["fit"], r["kind"], "|", r["name"], "|", "; ".join(r["why"])[:150], "|", r["flags"])
