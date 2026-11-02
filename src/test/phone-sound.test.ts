import { describe, expect, it } from "vitest";
import { isPhoneDevice } from "@/lib/landscape";
describe("phone sound rule", () => {
  it("touch phone is muted", () => expect(isPhoneDevice({ coarse: true, shortSide: 390 })).toBe(true));
  it("desktop keeps sound", () => expect(isPhoneDevice({ coarse: false, shortSide: 800 })).toBe(false));
  it("touch tablet keeps sound", () => expect(isPhoneDevice({ coarse: true, shortSide: 820 })).toBe(false));
});
