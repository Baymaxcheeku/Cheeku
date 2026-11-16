import { describe, expect, it } from "vitest";

import { readAttachment } from "./thread";

const U = "11111111-1111-1111-1111-111111111111";
const P = "22222222-2222-2222-2222-222222222222";
const F = "33333333-3333-3333-3333-333333333333";

describe("a photo on a message", () => {
  it("keeps what Cheeku saw, and the stored copy only at our own path shape", () => {
    expect(readAttachment({ kind: "photo", summary: "Strip of cetirizine.", path: `${U}/${P}/chat-${F}.jpg` })).toEqual({ kind: "photo", summary: "Strip of cetirizine.", path: `${U}/${P}/chat-${F}.jpg`, thumb: null });
    expect(readAttachment({ kind: "photo", summary: "x", path: "../../someone-else/file.jpg" })).toMatchObject({ path: null });
    expect(readAttachment({ kind: "photo", summary: "  " })).toEqual({ kind: "photo", summary: null, path: null, thumb: null });
  });

  it("still draws the first version's thumbnails, and nothing that isn't an image", () => {
    expect(readAttachment({ kind: "photo", thumb: "data:image/jpeg;base64,AAAA" })).toMatchObject({ thumb: "data:image/jpeg;base64,AAAA" });
    expect(readAttachment({ kind: "photo", thumb: "javascript:alert(1)" })).toMatchObject({ thumb: null });
    expect(readAttachment({ kind: "video" })).toBeNull();
    expect(readAttachment(null)).toBeNull();
  });
});
