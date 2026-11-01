import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceSound } from "@/lib/race-sound";

describe("replacement race audio", () => {
  let sources: { buffer: unknown; loop: boolean; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[];
  let decode: () => Promise<unknown>;
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  beforeEach(() => {
    sources = [];
    decode = async () => ({ duration: 15 });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })));
    vi.stubGlobal("AudioContext", class {
      destination = {};
      resume = vi.fn(async () => {});
      close = vi.fn(async () => {});
      decodeAudioData = () => decode();
      createGain = () => ({ gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() });
      createBufferSource = () => {
        const source = { buffer: undefined, loop: false, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn() };
        sources.push(source);
        return source;
      };
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("stops a 15-second UFO clip immediately when its animation ends", async () => {
    const sound = new RaceSound(); sound.setEnabled(true);
    sound.syncRace(["ufo"], true); await flush();
    const beam = sources.find((s) => s.loop && s.buffer);
    expect(sources).toHaveLength(2);
    // Hoofbeats are created first, UFO second.
    const ufo = sources[1];
    expect(beam).toBeDefined();
    expect(ufo?.buffer).toEqual({ duration: 15 });
    sound.syncRace(["normal"], true);
    expect(ufo?.stop).toHaveBeenCalledTimes(1);
    expect(sources[0]?.stop).not.toHaveBeenCalled();
  });

  it("keeps the beam until the last overlapping UFO animation ends", async () => {
    const sound = new RaceSound(); sound.setEnabled(true);
    sound.syncRace(["ufo", "ufo"], true); await flush();
    sound.syncRace(["normal", "ufo"], true); await flush();
    expect(sources).toHaveLength(2);
    expect(sources[1]?.stop).not.toHaveBeenCalled();
    sound.syncRace(["normal", "normal"], true);
    expect(sources[1]?.stop).toHaveBeenCalledTimes(1);
  });

  it("cancels a loading beam when the animation ends before decoding", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    const decoded = new Promise((r) => { resolve = r; });
    decode = () => decoded;
    const sound = new RaceSound(); sound.setEnabled(true);
    sound.syncRace(["ufo"], true); await flush();
    expect(resolve).toBeDefined();
    sound.syncRace([], false);
    resolve?.({ duration: 15 }); await flush();
    expect(sources).toHaveLength(0);
  });

  it("stops both loops when the race freezes", async () => {
    const sound = new RaceSound(); sound.setEnabled(true);
    sound.syncRace(["ufo"], true); await flush();
    sound.syncRace(["ufo"], false);
    expect(sources).toHaveLength(2);
    for (const source of sources) expect(source.stop).toHaveBeenCalledTimes(1);
  });

  it("mute cancels pending clips even if sound is enabled again", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    const decoded = new Promise((r) => { resolve = r; });
    decode = () => decoded;
    const sound = new RaceSound(); sound.setEnabled(true);
    void sound.playClip("decision"); await flush();
    sound.setEnabled(false); sound.setEnabled(true);
    resolve?.({ duration: 4 }); await flush();
    expect(sources).toHaveLength(0);
  });

  it("plays biped, rocket, jet, scuba and copter once each; lunge only plays per snap", async () => {
    const sound = new RaceSound(); sound.setEnabled(true); await flush();
    for (const state of ["biped", "rocket", "skate", "jet", "scuba", "laksa", "copter", "lunge", "wiped", "timeout"] as const) sound.play(state);
    await flush();
    expect(sources).toHaveLength(5);
    for (let i = 0; i < 3; i++) void sound.playClip("lunge");
    await flush();
    expect(sources).toHaveLength(8);
    expect(fetch).toHaveBeenCalledTimes(15);
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    for (const name of ["440hz", "550hz", "660hz", "gates_open_go"]) expect(urls.some((u) => u.includes(name))).toBe(true);
    expect(urls.some((u) => u.includes("race-countdown"))).toBe(false);
  });
});