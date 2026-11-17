import { describe, expect, it, vi } from "vitest";

const launchImageLibraryAsync = vi.fn();
const requestMediaLibraryPermissionsAsync = vi.fn();
vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...a: unknown[]) => launchImageLibraryAsync(...a),
  launchCameraAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(async () => ({ granted: false })),
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) => requestMediaLibraryPermissionsAsync(...a),
}));
// The permission sheet is UI; here the person has already said yes.
vi.mock("@/lib/upload/media-access", () => ({ ensureMediaAccess: async () => true }));
// Each render "saves" a JPEG whose size is whatever it was resized to.
vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: (uri: string) => {
      let size = { width: 4000, height: 3000 };
      const ctx = {
        resize: (s: { width?: number; height?: number }) => {
          size = s.width ? { width: s.width, height: Math.round((s.width * 3) / 4) } : { width: Math.round(((s.height ?? 0) * 4) / 3), height: s.height ?? 0 };
          return ctx;
        },
        renderAsync: async () => ({ ...size, saveAsync: async () => ({ uri: `${uri}>${size.width}`, ...size, base64: `B64${size.width}` }) }),
      };
      return ctx;
    },
  },
}));

const { fit, keepableCopy, pickChatPhoto, within } = await import("./photo");

describe("chat photos", () => {
  it("shrinks the long side and never upscales", () => {
    expect(fit(4000, 3000, 1280)).toEqual({ width: 1280 });
    expect(fit(3000, 4000, 1280)).toEqual({ height: 1280 });
    expect(fit(800, 600, 1280)).toBeNull();
    expect(fit(0, 0, 1280)).toBeNull();
  });

  it("opens the library without asking for photo permission", async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickChatPhoto("library")).toBeNull();
    expect(requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  });

  it("makes one 1280 copy for the model, keeps no thumbnail, and says when it starts", async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: "file://p.heic", width: 4000, height: 3000 }] });
    const picked = vi.fn();
    const got = await pickChatPhoto("library", picked);
    expect(picked).toHaveBeenCalledOnce();
    expect(got).toEqual({ uri: "file://p.heic>1280", image: { mimeType: "image/jpeg", data: "B641280" }, original: { uri: "file://p.heic", width: 4000, height: 3000 } });
  });

  it("re-draws the kept copy at 2048 px from the original, so no EXIF is stored", async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: "file://p.heic", width: 4000, height: 3000 }] });
    const got = await pickChatPhoto("library");
    if (!got || typeof got === "string") throw new Error("no photo");
    expect(await keepableCopy(got)).toBe("file://p.heic>2048");
  });

  it("turns a picker failure into a sentence instead of hanging", async () => {
    launchImageLibraryAsync.mockRejectedValue(new Error("presentation failed"));
    expect(await pickChatPhoto("library")).toMatch(/Couldn't open your photos/);
    expect(await pickChatPhoto("camera")).toMatch(/Couldn't open the camera/);
  });

  it("gives up on work that never finishes", async () => {
    vi.useFakeTimers();
    const p = within(1000, new Promise(() => undefined));
    vi.advanceTimersByTime(1001);
    await expect(p).rejects.toThrow("timed_out");
    vi.useRealTimers();
  });
});
