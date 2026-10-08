import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));

import { consentedVersions } from "./documents";
import { evaluateConsent, parseState, signupConsentPayload, type LedgerRow } from "./consent";
import { REQUIRED_PURPOSES } from "./purposes";

const V = { terms: "2026-10-08", privacy: "2026-10-08", health_consent: "2026-10-08" };

const grantAll = (at: string, versions = V, seq = 1): LedgerRow[] =>
  REQUIRED_PURPOSES.map((p, i) => ({ consent_type: p, granted: true, granted_at: at, method: "signup_checkbox", document_versions: versions, seq: seq + i }));

describe("evaluateConsent mirrors my_consent_state()", () => {
  it("asks someone who never agreed", () => {
    const s = evaluateConsent([], V);
    expect(s.reason).toBe("never");
    expect(s.needsConsent).toBe(true);
    expect(s.missing).toEqual([...REQUIRED_PURPOSES]);
  });

  it("is satisfied by a full grant of the current texts", () => {
    const s = evaluateConsent(grantAll("2026-10-08T10:00:00Z"), V);
    expect(s.needsConsent).toBe(false);
    expect(s.reason).toBeNull();
  });

  it("pauses when any one required purpose is withdrawn later", () => {
    const rows = [...grantAll("2026-10-08T10:00:00Z"), { consent_type: "ai_assistance", granted: false, granted_at: "2026-10-09T10:00:00Z", seq: 99 }];
    const s = evaluateConsent(rows, V);
    expect(s.reason).toBe("withdrawn");
    expect(s.missing).toEqual(["ai_assistance"]);
  });

  it("orders decisions made in the same instant by sequence", () => {
    const at = "2026-10-08T10:00:00Z";
    const rows: LedgerRow[] = [
      ...grantAll(at),
      { consent_type: "marketing", granted: true, granted_at: at, seq: 10 },
      { consent_type: "marketing", granted: false, granted_at: at, seq: 11 },
    ];
    expect(evaluateConsent(rows, V).decisions.marketing?.granted).toBe(false);
  });

  it("asks again when a newer material version is in force", () => {
    const s = evaluateConsent(grantAll("2026-10-08T10:00:00Z"), { ...V, privacy: "2026-12-01" });
    expect(s.reason).toBe("updated");
    expect(s.stale).toEqual(["privacy"]);
  });

  it("ignores legacy ledger rows it does not know", () => {
    const rows = [{ consent_type: "dpdp_processing", granted: true, granted_at: "2026-01-01T00:00:00Z" }];
    expect(evaluateConsent(rows, V).reason).toBe("never");
  });

  it("optional uses never satisfy the required ones", () => {
    const rows = [{ consent_type: "marketing", granted: true, granted_at: "2026-10-08T10:00:00Z" }];
    expect(evaluateConsent(rows, V).reason).toBe("never");
  });
});

describe("parseState", () => {
  it("reads the database shape and drops unknown purposes", () => {
    const s = parseState({
      purposes: { account: { granted: true, at: "x", method: "signup_checkbox", versions: V }, dpdp_processing: { granted: true } },
      current_versions: V,
      accepted_versions: V,
      missing: ["health_records", "bogus"],
      stale: [],
      needs_consent: true,
      reason: "withdrawn",
    });
    expect(Object.keys(s.decisions)).toEqual(["account"]);
    expect(s.missing).toEqual(["health_records"]);
    expect(s.reason).toBe("withdrawn");
    expect(s.available).toBe(true);
  });
});

describe("signup payload", () => {
  it("names every required purpose, the exact versions shown, and the device", () => {
    const p = signupConsentPayload();
    expect(p.accepted).toBe(true);
    expect(p.purposes).toEqual([...REQUIRED_PURPOSES]);
    expect(p.versions).toEqual(consentedVersions());
    expect(p.fingerprint).toMatch(/^terms:[0-9a-f]{64}\|privacy:[0-9a-f]{64}\|health_consent:[0-9a-f]{64}$/);
    expect(p.source).toBe("ios");
  });

  it("never pre-ticks an optional use", () => {
    expect(signupConsentPayload().purposes).not.toContain("marketing");
    expect(signupConsentPayload().purposes).not.toContain("research_insights");
  });
});
