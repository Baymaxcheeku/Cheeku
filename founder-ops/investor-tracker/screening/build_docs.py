import json, re, sys, time
d = json.load(open("screened.json"))
slug = lambda s: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")[:60]
NOW = int(time.time() * 1000)
def angle(r):
    w = " ".join(r["why"]).lower()
    if r["kind"] == "Accelerator": return "program"
    if "health portfolio" in w or "health or wellness" in w: return "health"
    if re.search(r"pi ventures|speciale|emergic|ankur|endiya|idein|iron pillars|logic ventures", r["name"].lower()): return "ai"
    if "consumer" in w: return "consumer"
    return "general"
ROLE = {"VC": {"A": "Lead or co-lead", "B": "Co-invest", "C": "Follow-on"}, "Angel": {"A": "Angel cheque and intros", "B": "Angel cheque", "C": "Angel cheque"},
        "Accelerator": {"A": "Programme and first cheque", "B": "Programme and first cheque", "C": "Programme"},
        "Angel network": {"A": "Syndicate round", "B": "Syndicate round", "C": "Syndicate round"}, "Platform": {"A": "Syndicate", "B": "Syndicate", "C": "Syndicate"}}
docs, seen = {}, set()
for r in d["targets"]:
    i = slug(r["name"]); 
    while i in seen: i += "-2"
    seen.add(i)
    docs["investors/" + i] = {
        "name": r["name"], "kind": r["kind"], "tier": r["tier"], "fit": r["fit"], "why": r["why"], "flags": r["flags"],
        "angle": angle(r), "role": ROLE.get(r["kind"], ROLE["VC"])[r["tier"]],
        "people": r.get("people", [])[:6], "email": r.get("email", ""), "linkedin": r.get("linkedin", ""), "twitter": r.get("twitter", ""),
        "website": ("https://" + r["website"]) if r.get("website") and not r["website"].startswith("http") else r.get("website", ""),
        "city": r.get("city", ""), "portfolio": (r.get("portfolio") or "")[:400], "about": (r.get("about") or "")[:400],
        "stageFocus": r.get("stageFocus", ""), "sources": r["sources"],
        "stage": "target", "owner": "", "intro": "", "nextStep": "", "nextDate": "", "lastTouch": None, "amount": None, "notes": "",
        "createdAt": NOW, "updatedAt": NOW, "updatedBy": None,
    }
pool = [dict(name=r["name"], city=r.get("city", ""), email=r.get("email", ""), linkedin=r.get("linkedin", ""), status="Out",
             reason="; ".join(r["why"])[:200], kind=r.get("kind", "")) for r in d["dropped"]]
pool += [dict(name=r["name"], city=r["city"], email=r["email"], linkedin=r["linkedin"], status=r["status"], reason=r["reason"], kind="Angel") for r in d["pool"]]
for n in range(0, len(pool), 200):
    docs["pool/part-%d" % (n // 200 + 1)] = {"rows": pool[n:n + 200]}
docs["meta/context"] = {"text": open("context.txt").read(), "updatedAt": NOW, "updatedBy": None}
docs["meta/team"] = {"members": [
    {"key": "athar", "name": "Athar Ali", "role": "Co-founder and CEO", "email": "athar@cheekuai.in"},
    {"key": "deepesh", "name": "Deepesh Mahajan", "role": "Co-founder and CBO", "email": ""}]}
json.dump(docs, open("docs.json", "w"), ensure_ascii=False)
print(len(docs), sum(1 for k in docs if k.startswith("investors/")), max(len(json.dumps(v)) for v in docs.values()))
import collections; print(collections.Counter(v["angle"] for k, v in docs.items() if k.startswith("investors/")))
