import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-linking", () => ({ createURL: (path: string) => `cheekuai://${path}` }));
vi.mock("react-native", () => ({ AppState: {}, Platform: { OS: "ios" } }));
vi.mock("@/lib/supabase/client", () => ({ supabase: { auth: {} } }));

const { parseEmailLink } = await import("./email-link");
const { statusFor } = await import("./state");

describe("parseEmailLink: what the confirmation link carries", () => {
  it("reads the one-time code (Expo Go and build URLs alike)", () => {
    for (const base of ["cheekuai://auth/callback", "exp://192.168.1.4:8081/--/auth/callback"]) {
      expect(parseEmailLink(`${base}?code=6f1c2d9e-0b7a`)).toEqual({ kind: "code", code: "6f1c2d9e-0b7a" });
    }
  });

  it("refuses a link that carries a ready-made session (login CSRF)", () => {
    expect(parseEmailLink("cheekuai://auth/callback#access_token=a.b.c&refresh_token=r1&type=signup")).toEqual({
      kind: "failed",
    });
    // Not even alongside a code: a doctored link is never half-trusted.
    expect(parseEmailLink("cheekuai://auth/callback?code=c1#access_token=a&refresh_token=r")).toEqual({ kind: "failed" });
  });

  it("tells an expired link from a broken one", () => {
    expect(
      parseEmailLink("cheekuai://auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid"),
    ).toEqual({ kind: "expired" });
    expect(parseEmailLink("cheekuai://auth/callback?error=server_error&error_description=x")).toEqual({ kind: "failed" });
  });

  it("an error wins over a code", () => {
    expect(parseEmailLink("cheekuai://auth/callback?error=access_denied&code=c1")).toEqual({ kind: "failed" });
  });

  it("needs a code", () => {
    expect(parseEmailLink("cheekuai://auth/callback?type=signup")).toEqual({ kind: "empty" });
    expect(parseEmailLink("cheekuai://auth/callback")).toEqual({ kind: "empty" });
    expect(parseEmailLink(null)).toEqual({ kind: "empty" });
  });

  it("a malformed escape is a failed link, not a crash", () => {
    expect(parseEmailLink("cheekuai://auth/callback?code=%E0%A4%A")).toEqual({ kind: "failed" });
  });
});

describe("statusFor: who the guards let in", () => {
  const session = (confirmed: string | null) => ({ user: { email_confirmed_at: confirmed } }) as unknown as Session;

  it("no session is signed out", () => {
    expect(statusFor(null)).toBe("signedOut");
  });

  it("a session whose email was never confirmed does not open the app", () => {
    expect(statusFor(session(null))).toBe("unverified");
  });

  it("a confirmed email is signed in", () => {
    expect(statusFor(session("2026-11-01T10:00:00Z"))).toBe("signedIn");
  });
});
