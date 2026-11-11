import { describe, expect, it } from "vitest";

import { MESSAGES, authMessage, isOffline, isRateLimited, isUnconfirmed, sendFailure } from "./errors";

describe("authMessage", () => {
  it("never tells sign-in apart for a wrong password and a missing account", () => {
    const wrong = authMessage({ code: "invalid_credentials", status: 400 }, "signIn");
    const missing = authMessage({ code: "user_not_found", status: 400 }, "signIn");
    const unknown = authMessage({ code: "something_new", status: 400 }, "signIn");
    expect(wrong).toBe(MESSAGES.credentials);
    expect(missing).toBe(wrong);
    expect(unknown).toBe(wrong);
  });

  it("says a rate limit is a rate limit on every step", () => {
    for (const step of ["signIn", "signUp", "verify", "newPassword"] as const) {
      expect(authMessage({ code: "over_request_rate_limit", status: 429 }, step)).toBe(MESSAGES.rateLimited);
      expect(authMessage({ status: 429 }, step)).toBe(MESSAGES.rateLimited);
    }
  });

  it("says no signal is no signal, not a wrong password", () => {
    expect(authMessage({ name: "AuthRetryableFetchError", status: 0 }, "signIn")).toBe(MESSAGES.offline);
    expect(authMessage({ status: 0 }, "verify")).toBe(MESSAGES.offline);
  });

  it("maps sign-up failures that say nothing about an account", () => {
    expect(authMessage({ code: "email_address_invalid" }, "signUp")).toBe(MESSAGES.badAddress);
    expect(authMessage({ code: "weak_password" }, "signUp")).toBe(MESSAGES.weakPassword);
    expect(authMessage({ code: "signup_disabled" }, "signUp")).toBe(MESSAGES.signupClosed);
    expect(authMessage({ code: "email_address_not_authorized" }, "signUp")).toBe(MESSAGES.undeliverable);
  });

  it("never shows Supabase's own text for an existing account", () => {
    const msg = authMessage({ code: "user_already_exists", message: "User already registered" }, "signUp");
    expect(msg).toBe(MESSAGES.signupFailed);
    expect(msg).not.toMatch(/registered/i);
  });

  it("treats a wrong code and an expired one the same", () => {
    expect(authMessage({ code: "otp_expired", status: 403 }, "verify")).toBe(MESSAGES.wrongCode);
    expect(authMessage({ code: "anything" }, "verify")).toBe(MESSAGES.wrongCode);
  });

  it("explains a refused new password", () => {
    expect(authMessage({ code: "same_password" }, "newPassword")).toBe(MESSAGES.samePassword);
    expect(authMessage({ code: "session_not_found" }, "newPassword")).toBe(MESSAGES.resetExpired);
    expect(authMessage({ code: "unknown" }, "newPassword")).toBe(MESSAGES.saveFailed);
  });
});

describe("sendFailure", () => {
  it("shows a code as sent when the failure could reveal whether an account exists", () => {
    expect(sendFailure(null)).toBeNull();
    expect(sendFailure({ code: "otp_disabled", status: 422 })).toBeNull();
    expect(sendFailure({ code: "user_not_found", status: 404 })).toBeNull();
    expect(sendFailure({ code: "something_new" })).toBeNull();
  });

  it("surfaces failures that are true for every address", () => {
    expect(sendFailure({ code: "over_email_send_rate_limit", status: 429 })).toBe(MESSAGES.rateLimited);
    expect(sendFailure({ status: 0 })).toBe(MESSAGES.offline);
    expect(sendFailure({ code: "email_address_invalid" })).toBe(MESSAGES.badAddress);
  });
});

describe("predicates", () => {
  it("recognises each case", () => {
    expect(isUnconfirmed({ code: "email_not_confirmed" })).toBe(true);
    expect(isUnconfirmed({ code: "invalid_credentials" })).toBe(false);
    expect(isRateLimited(null)).toBe(false);
    expect(isOffline(undefined)).toBe(false);
  });
});
