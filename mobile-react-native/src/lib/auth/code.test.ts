import { afterEach, describe, expect, it } from "vitest";

import {
  cleanCode,
  clearPendingCode,
  formatCountdown,
  getPendingCode,
  isCompleteCode,
  isSignedOutRoute,
  markCodeResent,
  otpType,
  parseCodeLength,
  secondsUntilResend,
  setPendingCode,
} from "./code";

describe("code rules", () => {
  it("uses the recovery type only for a password reset", () => {
    expect(otpType("signup")).toBe("email");
    expect(otpType("login")).toBe("email");
    expect(otpType("recovery")).toBe("recovery");
  });

  it("keeps digits only, up to the length", () => {
    expect(cleanCode("123 456", 6)).toBe("123456");
    expect(cleanCode("Your code is 482-913.", 6)).toBe("482913");
    expect(cleanCode("12345678", 6)).toBe("123456");
    expect(cleanCode("abc", 6)).toBe("");
  });

  it("knows a complete code", () => {
    expect(isCompleteCode("123456", 6)).toBe(true);
    expect(isCompleteCode("12345", 6)).toBe(false);
    expect(isCompleteCode("12345a", 6)).toBe(false);
  });

  it("accepts only the lengths Supabase allows", () => {
    expect(parseCodeLength(undefined)).toBe(6);
    expect(parseCodeLength("8")).toBe(8);
    expect(parseCodeLength("4")).toBe(6);
    expect(parseCodeLength("11")).toBe(6);
    expect(parseCodeLength("six")).toBe(6);
  });

  it("counts the resend wait down to zero and no further", () => {
    const sent = 1_000_000;
    expect(secondsUntilResend(sent, sent)).toBe(60);
    expect(secondsUntilResend(sent, sent + 1)).toBe(60);
    expect(secondsUntilResend(sent, sent + 18_000)).toBe(42);
    expect(secondsUntilResend(sent, sent + 60_000)).toBe(0);
    expect(secondsUntilResend(sent, sent + 600_000)).toBe(0);
    // A clock that went backwards never waits longer than the full minute.
    expect(secondsUntilResend(sent, sent - 30_000)).toBe(60);
  });

  it("formats the countdown", () => {
    expect(formatCountdown(42)).toBe("0:42");
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});

describe("pending code", () => {
  afterEach(clearPendingCode);

  it("normalises the address and resets the clock on resend", () => {
    setPendingCode({ email: "  Asha@Example.com ", purpose: "signup", sentAt: 1 });
    expect(getPendingCode()).toEqual({ email: "asha@example.com", purpose: "signup", sentAt: 1 });
    markCodeResent(99);
    expect(getPendingCode()?.sentAt).toBe(99);
    clearPendingCode();
    expect(getPendingCode()).toBeNull();
    markCodeResent(5);
    expect(getPendingCode()).toBeNull();
  });
});

describe("signed-out routes", () => {
  it("lists where a signed-out person may be", () => {
    for (const p of ["/", "/welcome", "/sign-in", "/verify", "/reset-password", "/legal/privacy"]) {
      expect(isSignedOutRoute(p)).toBe(true);
    }
    for (const p of ["/home", "/settings/security", "/records/abc", "/who"]) {
      expect(isSignedOutRoute(p)).toBe(false);
    }
  });
});
