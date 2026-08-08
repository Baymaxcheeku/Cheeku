import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The app lock's decision logic, with the platform mocked out.
 *
 * The three properties tested here are the ones whose failure mode is a lock
 * that quietly does nothing, which is worse than no lock at all because the
 * reader stops worrying about who can open the app.
 */

const auth = {
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  supportedAuthenticationTypesAsync: vi.fn(),
  authenticateAsync: vi.fn(),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
};

const store = new Map<string, string>();

vi.mock("expo-local-authentication", () => auth);
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("@/lib/storage", () => ({
  kv: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => void store.set(k, v),
    remove: async (k: string) => void store.delete(k),
  },
}));

const { isLockEnabled, lockCapability, setLockEnabled } = await import("./app-lock");

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
  auth.authenticateAsync.mockResolvedValue({ success: true });
});

describe("lockCapability", () => {
  it("refuses to offer the lock when nothing is enrolled", async () => {
    // Hardware present but no finger or face registered. Offering the toggle
    // here produces a switch that turns on and never challenges anybody.
    auth.isEnrolledAsync.mockResolvedValue(false);
    expect(await lockCapability()).toEqual({ available: false, reason: "not-enrolled" });
  });

  it("separates 'no hardware' from 'not set up', because only one is fixable", async () => {
    auth.hasHardwareAsync.mockResolvedValue(false);
    expect(await lockCapability()).toEqual({ available: false, reason: "unsupported" });
  });

  it("prefers face over fingerprint when the device offers both", async () => {
    auth.supportedAuthenticationTypesAsync.mockResolvedValue([1, 2]);
    expect(await lockCapability()).toEqual({ available: true, kind: "face" });
  });

  it("still offers the lock when the only enrolled factor is the passcode", async () => {
    auth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
    expect(await lockCapability()).toEqual({ available: true, kind: "passcode" });
  });
});

describe("setLockEnabled", () => {
  it("does not turn the lock ON unless the challenge passes", async () => {
    // Otherwise someone holding the phone can enable a lock against its owner
    // and hand it back.
    auth.authenticateAsync.mockResolvedValue({ success: false });
    expect(await setLockEnabled(true)).toBe(false);
    expect(await isLockEnabled()).toBe(false);
  });

  it("does not turn the lock OFF unless the challenge passes", async () => {
    // The settings screen is reachable the moment the app is unlocked, so a
    // lock anyone can switch off from behind it is not a lock.
    await setLockEnabled(true);
    expect(await isLockEnabled()).toBe(true);

    auth.authenticateAsync.mockResolvedValue({ success: false });
    expect(await setLockEnabled(false)).toBe(false);
    expect(await isLockEnabled()).toBe(true);
  });

  it("turns on and off when the challenge passes", async () => {
    expect(await setLockEnabled(true)).toBe(true);
    expect(await isLockEnabled()).toBe(true);
    expect(await setLockEnabled(false)).toBe(true);
    expect(await isLockEnabled()).toBe(false);
  });

  it("stays locked when the platform throws rather than failing open", async () => {
    auth.authenticateAsync.mockRejectedValue(new Error("sensor unavailable"));
    expect(await setLockEnabled(true)).toBe(false);
    expect(await isLockEnabled()).toBe(false);
  });
});
