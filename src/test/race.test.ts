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

import { underdogPanic as up, midPackChaos as mp, durationFor, LUNGE_EVERY } from "@/lib/race";
describe("gadget picks", () => {
  it("underdog can pick the hoverboard and rocket", () => {
    expect(up(() => 0.3)).toBe("skate");
    expect(up(() => 0.2)).toBe("rocket");
  });
  it("underdog can pick the five new boosts", () => {
    expect([0.4, 0.55, 0.7, 0.8, 0.99].map((r) => up(() => r))).toEqual(["jet", "scuba", "laksa", "copter", "lunge"]);
  });
  it("boost speeds: jet 3x, scuba 2.5x, laksa 2.5x, copter 2.2x", () => {
    expect(speedFor("jet", 0, 100)).toBe(300);
    expect(speedFor("scuba", 0, 100)).toBe(250);
    expect(speedFor("laksa", 0, 100)).toBe(250);
    expect(speedFor("copter", 0, 100)).toBeCloseTo(220);
  });
  it("court lunge snaps three times", () => {
    expect(durationFor("lunge") / LUNGE_EVERY).toBeCloseTo(3);
  });
  it("mid-pack can pick any of the 8 boosts, not just rocket/hoverboard", () => {
    const seq = (vals: number[]) => { let k = 0; return () => vals[k++]!; };
    expect(mp(seq([0.1, 0.4]))).toBe("jet");
    expect(mp(seq([0.1, 0.99]))).toBe("lunge");
    expect(mp(seq([0.9, 0.5]))).toBe("moonwalk");
  });
  it("never repeats the previous boost", () => {
    for (let r = 0; r < 1; r += 0.05) expect(up(() => r, "rocket")).not.toBe("rocket");
  });
});

import { GADGET_POOL, chaserState as cs, randomState as rs, RUSH_STATES } from "@/lib/race";
describe("unified gadget pool", () => {
  it("chaser and random rolls can hand out any of the 8 gadgets", () => {
    const seq = (v: number[]) => { let k = 0; return () => v[k++]!; };
    expect(cs(seq([0.4, 0.99]))).toBe("lunge");
    expect(rs(seq([0.5, 0.4]), false)).toBe("jet");
    for (const g of GADGET_POOL) expect(RUSH_STATES).toContain(g);
  });
});
