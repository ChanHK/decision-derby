import { describe, expect, it } from "vitest";
import {
  COLUMN_CHROME,
  MIN_FIT,
  canRaceHorizontally,
  fitScale,
  isRotated,
  podiumShape,
  showGate,

  trackHeight,
} from "@/lib/landscape";

describe("sideways race stage", () => {
  it("makes the track tall enough for every lane plus the sky, crowd and rails", () => {
    expect(trackHeight(3)).toBe(160 + 3 * 150);
    expect(trackHeight(5)).toBe(160 + 5 * 150);
  });

  it("keeps the track at natural size when the screen has room", () => {
    expect(fitScale(1200, trackHeight(3))).toBe(1);
    expect(fitScale(trackHeight(3), trackHeight(3))).toBe(1);
  });

  it("shrinks the track to exactly the room there is on a sideways phone", () => {
    // landscape phone: ~393px of screen, minus the mini-map strip and gaps
    const avail = 393 - 60 - COLUMN_CHROME;
    expect(fitScale(avail, trackHeight(3))).toBeCloseTo(avail / trackHeight(3), 5);
  });

  it("never shrinks past the point where the horses stop being readable", () => {
    expect(fitScale(40, trackHeight(5))).toBe(MIN_FIT);
  });

  it("keeps the natural size when it has nothing to measure yet", () => {
    expect(fitScale(0, trackHeight(3))).toBe(1);
    expect(fitScale(Number.NaN, trackHeight(3))).toBe(1);
  });

  it("only needs turning when the phone is upright and has not been forced sideways", () => {
    expect(canRaceHorizontally({ portrait: true, forced: false })).toBe(false);
    expect(canRaceHorizontally({ portrait: true, forced: true })).toBe(true);
    expect(canRaceHorizontally({ portrait: false, forced: false })).toBe(true);
  });

  it("draws the stage rotated only for an upright phone that was forced", () => {
    expect(isRotated({ portrait: true, forced: true })).toBe(true);
    expect(isRotated({ portrait: true, forced: false })).toBe(false);
    expect(isRotated({ portrait: false, forced: true })).toBe(false);
  });

  it("prompts to turn the phone before the race and while it runs upright", () => {
    expect(showGate({ portrait: true, forced: false, dismissed: false, started: false, pending: true })).toBe(true);
    expect(showGate({ portrait: true, forced: false, dismissed: false, started: true, pending: false })).toBe(true);
  });

  it("stays quiet once the phone is sideways, forced, or the user chose to keep upright", () => {
    expect(showGate({ portrait: false, forced: false, dismissed: false, started: true, pending: true })).toBe(false);
    expect(showGate({ portrait: true, forced: true, dismissed: false, started: true, pending: true })).toBe(false);
    expect(showGate({ portrait: true, forced: false, dismissed: true, started: true, pending: false })).toBe(false);
    expect(showGate({ portrait: true, forced: false, dismissed: false, started: false, pending: false })).toBe(false);
  });
});

describe("podiumShape", () => {
  it("shrinks the winners when the screen is short", () => {
    const short = podiumShape(true);
    const tall = podiumShape(false);
    expect(short.horse).toBeLessThan(tall.horse);
    expect(short.blocks).toEqual([64, 46, 30]);
    expect(tall.blocks).toEqual([96, 66, 44]);
  });
});
