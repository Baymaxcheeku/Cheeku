"""Seed split model: angel iSAFE (cap + discount) converting inside the institutional round.

All money in rupees crore. Cap is post-money (iSAFE is drafted on post-money, confirm in the
template). The institutional round is quoted by its post-money V (company value right after the
whole seed, angels included), so the VC pre-money P = V - X and the iSAFE converts inside P.
"""

FOUNDERS_PRE = 0.90   # founders' share before seed; the other 10% is the option pool (our-story.md)

def convert(I, C, d, V, X):
    """Return dict for angel cheque I, post-money cap C, discount d, VC cheque X, seed post-money V."""
    P = V - X
    a_cap = (I / C) * P / V          # cap price: fixed slice of the pre-round company
    a_disc = (I / (1 - d)) / V       # discount price
    a_par = I / V                    # converting at the round price, no benefit
    a = max(a_cap, a_disc, a_par)
    vc = X / V
    D = a + vc
    binds = "cap" if a == a_cap and a_cap >= a_disc else ("discount" if a == a_disc else "none")
    return dict(P=P, angel=a, vc=vc, D=D, par=(I + X) / V, tax=D - (I + X) / V,
                founders=FOUNDERS_PRE * (1 - D), stepup=a * V / I, binds=binds)

def shares_check(I, C, d, V, X):
    """Independent share-count version of the cap path, to prove the closed form."""
    S0 = 100.0
    safe = S0 * (I / C) / (1 - I / C)            # post-money SAFE shares
    pre_total = S0 + safe
    pps = (V - X) / pre_total
    vc_sh = X / pps
    return safe / (pre_total + vc_sh), vc_sh / (pre_total + vc_sh)

def min_cap(I, X, V, D, d=0.0):
    """Lowest post-money cap that keeps total seed dilution <= D (cap path)."""
    den = D * V - X
    return float("inf") if den <= 0 else I * (V - X) / den

def max_vc_cheque(I, C, P, D):
    """Largest institutional cheque X so that total dilution <= D, given VC pre-money P (cap path)."""
    a = I / C
    return (D - a) * P / (1 - D)

if __name__ == "__main__":
    for V in (110, 116, 120, 130, 140, 153):
        for C in (75, 80, 85, 90, 100):
            for d in (0.0, 0.10, 0.15, 0.20):
                r = convert(5, C, d, V, 21)
                a, v = shares_check(5, C, d, V, 21)
                if r["binds"] == "cap":
                    assert abs(a - r["angel"]) < 1e-9 and abs(v - r["vc"]) < 1e-9
    print("closed form matches share-count model")
    for V in (116, 130, 153):
        for C, d in ((75, .10), (80, .10), (85, .10), (85, .15), (90, .10), (100, .10)):
            r = convert(5, C, d, V, 21)
            print(V, C, d, f"angel {r['angel']*100:.2f} vc {r['vc']*100:.2f} D {r['D']*100:.2f} fnd {r['founders']*100:.1f} step {r['stepup']:.2f} {r['binds']}")
        print()
    for D in (.23, .20, .18):
        print(D, "V needed at par", round(26 / D, 1))
    print("min cap bear V116 D23:", round(min_cap(5, 21, 116, .23), 1), " V120:", round(min_cap(5, 21, 120, .23), 1), " V113:", round(min_cap(5, 21, 113, .23), 1))
