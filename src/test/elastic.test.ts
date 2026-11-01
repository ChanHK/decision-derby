import { describe, expect, it } from "vitest";
import { boostFailure, falseHope, isImmune, pileUp, reverseBoost, triggerChance } from "@/lib/race";

describe("elastic rubber-banding", () => {
  it("30% gap gives a 40% trigger chance; 10% or less never triggers", () => {
    expect(triggerChance(1300, 1000, 1000)).toBeCloseTo(0.4);
    expect(triggerChance(1100, 1000, 1000)).toBe(0);
    expect(triggerChance(1000, 1000, 1000)).toBe(0);
  });
  it("immunity lasts 2.5s after an animation ends", () => {
    expect(isImmune(12.5, 12.4)).toBe(true);
    expect(isImmune(12.5, 12.5)).toBe(false);
    expect(isImmune(undefined, 1)).toBe(false);
  });
  it("false hope hits rocket, jet and hoverboard 15% of the time", () => {
    expect(falseHope(() => 0.14, "rocket")).toBe(true);
    expect(falseHope(() => 0.15, "jet")).toBe(false);
    expect(falseHope(() => 0, "copter")).toBe(false);
    expect(boostFailure("skate")).toBe("wiped");
    expect(boostFailure("jet")).toBe("exploded");
  });
  it("pile-up only for momentum-stopping curses within 5% of the track", () => {
    expect(pileUp("glassdoor", 1000, 960, 1000)).toBe(true);
    expect(pileUp("soup", 1000, 950, 1000)).toBe(false);
    expect(pileUp("smash", 1000, 990, 1000)).toBe(false);
  });
  it("boosts fire backwards 20% of the time", () => {
    expect(reverseBoost(() => 0.19, "rocket")).toBe(true);
    expect(reverseBoost(() => 0.2, "rocket")).toBe(false);
    expect(reverseBoost(() => 0, "drunk")).toBe(false);
  });
});

import { directorChance } from "@/lib/race";
describe("director floor", () => {
  it("fires at least 45% of ticks even with no gap", () => {
    expect(directorChance(1000, 1000, 1000)).toBe(0.45);
    expect(directorChance(1400, 1000, 1000)).toBeCloseTo(0.6);
  });
});
