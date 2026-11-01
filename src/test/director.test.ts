import { describe, expect, it } from "vitest";
import { crashFinish, directorPhase, finishPurge, leaderCurse, midPackChaos, rubberBandActive, underdogPanic } from "@/lib/race";

describe("race director", () => {
  it("splits the race at 40% and 85%", () => {
    expect(directorPhase(0.39)).toBe("setup");
    expect(directorPhase(0.4)).toBe("rubber");
    expect(directorPhase(0.85)).toBe("finish");
  });
  it("rubber-bands only when the gap exceeds 15% of the screen", () => {
    expect(rubberBandActive(1150, 1000, 1000)).toBe(false);
    expect(rubberBandActive(1151, 1000, 1000)).toBe(true);
  });
  it("curses the leader with one of the six puppet penalties", () => {
    expect(leaderCurse(() => 0)).toBe("timeout");
    expect(leaderCurse(() => 0.2)).toBe("standby");
    expect(leaderCurse(() => 0.4)).toBe("smash");
    expect(leaderCurse(() => 0.55)).toBe("glassdoor");
    expect(leaderCurse(() => 0.7)).toBe("soup");
    expect(leaderCurse(() => 0.99)).toBe("tactile");
  });
  it("panics the underdog into two legs or a rocket", () => {
    expect(underdogPanic(() => 0.1)).toBe("biped");
    expect(underdogPanic(() => 0.2)).toBe("rocket");
  });
  it("mid-pack chaos gags are drunk, moonwalk or wrong way", () => {
    expect(["drunk", "moonwalk", "wrongway"]).toContain(midPackChaos(() => 0.6));
  });
  it("final stretch purges sleep, UFO and drunk but keeps mounts", () => {
    expect(finishPurge("nap")).toBe("normal");
    expect(finishPurge("ufo")).toBe("normal");
    expect(finishPurge("drunk")).toBe("normal");
    expect(finishPurge("rocket")).toBe("rocket");
  });
  it("mounts crash 5% before the finish", () => {
    expect(crashFinish("rocket", 0.94)).toBe("rocket");
    expect(crashFinish("rocket", 0.95)).toBe("exploded");
    expect(crashFinish("skate", 0.96)).toBe("wiped");
  });
});
