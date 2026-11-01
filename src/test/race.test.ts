import { describe, expect, it } from "vitest";
import { forwardCamera, randomState, speedFor } from "@/lib/race";

describe("race behavior", () => {
  it("never moves automatic camera backward after the leader finishes", () => {
    expect(forwardCamera(1800, 1200, 2400)).toBe(1800);
    expect(forwardCamera(1800, 2100, 2400)).toBe(2100);
  });
  it("gives leaders a higher chance of funny setbacks", () => {
    const leading = randomState(() => 0.3, true);
    expect(leading).toBe("moonwalk");
    expect(randomState(() => 0.4, false)).toBe("normal");
  });
  it("can reverse a boosted leader", () => {
    const rolls = [0.7, 0];
    const state = randomState(() => rolls.shift() ?? 0, true, "turbo");
    expect(state).toBe("wrongway");
    expect(speedFor(state, 1, 190, 0.9)).toBeLessThan(0);
  });
  it("allows a leader to fall asleep before the finish and stops movement", () => {
    const rolls = [0.3, 0.5];
    const state = randomState(() => rolls.shift() ?? 0, true);
    expect(state).toBe("nap");
    expect(speedFor(state, 1, 190, 0.95)).toBe(0);
  });
  it("leaders can stumble (slowed) or stop for a grass snack", () => {
    const stumble = randomState(((r) => () => r.shift() ?? 0)([0.3, 0.7]), true);
    expect(stumble).toBe("stumble");
    expect(speedFor(stumble, 1, 190, 0.5)).toBeCloseTo(38);
    const graze = randomState(((r) => () => r.shift() ?? 0)([0.3, 0.9]), true);
    expect(graze).toBe("graze");
    expect(speedFor(graze, 1, 190, 0.5)).toBe(0);
  });
});

import { bipedDone, rollBiped, speedFor as sp } from "@/lib/race";
describe("two-legged run", () => {
  it("only the last-place horse can start running on two legs", () => {
    expect(rollBiped(() => 0, true, 0.5)).toBe(true);
    expect(rollBiped(() => 0, false, 0.5)).toBe(false);
  });
  it("stops once it passes the horse ahead, then moves slowly", () => {
    expect(bipedDone(900, 950)).toBe(false);
    expect(bipedDone(951, 950)).toBe(true);
    expect(sp("winded", 0, 200)).toBeLessThan(200);
    expect(sp("winded", 0, 200)).toBeGreaterThan(0);
  });
});

import { burnoutState, chaserState } from "@/lib/race";
describe("competitive rules", () => {
  it("turbo usually ends in a burnout mishap", () => {
    expect(burnoutState(((r) => () => r.shift() ?? 0)([0.5, 0]), "turbo")).toBe("graze");
  });
  it("normal gallop never burns out", () => {
    expect(burnoutState(() => 0, "normal")).toBeNull();
  });
  it("last place goes two-legged 80% of rolls", () => {
    expect(rollBiped(() => 0.79, true, 0.5)).toBe(true);
    expect(rollBiped(() => 0.79, false, 0.5)).toBe(false);
  });
  it("chasers often push with turbo", () => {
    expect(chaserState(() => 0.2)).toBe("turbo");
  });
});

import { draftBoost } from "@/lib/race";
describe("rivalry", () => {
  it("drafts only a short way behind a rival", () => {
    expect(draftBoost(80)).toBeGreaterThan(1);
    expect(draftBoost(300)).toBe(1);
  });
});

import { burnoutState as bo, speedFor as sf } from "@/lib/race";
describe("gadget crashes", () => {
  it("rocket always explodes and the horse lies still", () => {
    expect(bo(() => 0.99, "rocket")).toBe("exploded");
    expect(sf("exploded", 0, 150)).toBe(0);
  });
  it("hoverboard always snaps", () => {
    expect(bo(() => 0.99, "skate")).toBe("wiped");
  });
});

import { underdogPanic as up, midPackChaos as mp } from "@/lib/race";
describe("gadget picks", () => {
  it("underdog can pick the hoverboard and rocket", () => {
    expect(up(() => 0.9)).toBe("skate");
    expect(up(() => 0.5)).toBe("rocket");
  });
  it("mid-pack can pick gadgets", () => {
    expect(mp(() => 0)).toBe("rocket");
    expect(mp(() => 0.25)).toBe("skate");
  });
});
