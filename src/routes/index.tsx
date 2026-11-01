import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Horse } from "@/components/Horse";
import { StartingGate } from "@/components/StartingGate";
import { Button } from "@/components/ui/button";
import { Crosshair, Volume2, VolumeX } from "lucide-react";
import rocketArt from "@/assets/rocket.png";
import hoverArt from "@/assets/hoverboard.png";
import { RaceSound } from "@/lib/race-sound";
import { PANIC_POOL, LUNGE_EVERY, LUNGE_SNAP, SELF_SPEED, CURSE_BUBBLES, CURSE_LINES, PANIC_LINES, PANIC_SPEED, PERSONALITIES, SPRINT_AT, STATE_INFO, crashFinish, directorPhase, durationFor, finishPurge, forwardCamera, leaderCurse, midPackChaos, rubberBandActive, speedFor, underdogPanic, type HorseState } from "@/lib/race";

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Derby Decider — Let horses make your decision" },
      { name: "description", content: "Enter up to 5 choices and watch cartoon horses race with surprise events to pick your decision." },
      { property: "og:title", content: "Derby Decider" },
      { property: "og:description", content: "A horse race that makes your decisions for you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const COATS = ["var(--horse-1)", "var(--horse-2)", "var(--horse-3)", "var(--horse-4)", "var(--horse-5)"];
const TRACK = 4700; // world px
const FINISH = 3600;
const START = 120;

type Phase = "setup" | "pan" | "countdown" | "race" | "climax" | "done";
type H = { x: number; state: HorseState; next: number; base: number; kick: number; finish?: number; chase?: number | undefined; bipedAt?: number; bumpCd?: number; line?: string | undefined; burnt?: boolean; bruised?: boolean; panic?: boolean; lungeAt?: number; lastBoost?: HorseState };

function Index() {
  const [choices, setChoices] = useState<string[]>(["Pizza", "Sushi", "Tacos"]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(3);
  const [horses, setHorses] = useState<H[]>([]);
  const [following, setFollowing] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const followRef = useRef(true);
  const autoCam = useRef(0);
  const soundRef = useRef<RaceSound | null>(null);
  const dragRef = useRef<{ x: number; scroll: number } | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [vw, setVw] = useState(1000);
  const [camX, setCamX] = useState(0);
  const [shake, setShake] = useState(false);
  const shakeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<H[]>([]);
  const valid = choices.map((c) => c.trim()).filter(Boolean);

  useEffect(() => {
    const sound = new RaceSound(); soundRef.current = sound;
    return () => { sound.dispose(); soundRef.current = null; };
  }, []);

  function toggleSound() {
    const enabled = !soundOn;
    setSoundOn(enabled); soundRef.current?.setEnabled(enabled);
  }

  function pauseFollow() {
    if (phase !== "race" && phase !== "done") return;
    followRef.current = false; setFollowing(false);
  }

  function resumeFollow() {
    followRef.current = true; setFollowing(true);
    viewRef.current?.scrollTo({ left: autoCam.current, behavior: "smooth" });
  }

  function moveCamera(x: number) {
    autoCam.current = x;
    setCamX(x);
    if (followRef.current && viewRef.current) viewRef.current.scrollLeft = x;
  }

  function punchShake() {
    setShake(true);
    if (shakeT.current) clearTimeout(shakeT.current);
    shakeT.current = setTimeout(() => setShake(false), 220);
  }

  const soundToggle = <Button variant="secondary" size="icon" className="cartoon-btn shrink-0" onClick={toggleSound}
    aria-label={soundOn ? "Mute sounds" : "Enable sounds"} aria-pressed={soundOn} title={soundOn ? "Mute sounds" : "Enable sounds"}>
    {soundOn ? <Volume2 /> : <VolumeX />}
  </Button>;

  useEffect(() => {
    const m = () => setVw(viewRef.current?.clientWidth ?? 1000);
    m(); window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, [phase]);

  const maxCam = Math.max(0, TRACK - vw);

  function start() {
    if (valid.length < 2) return;
    soundRef.current?.stopAll();
    soundRef.current?.setEnabled(soundOn);
    setChoices(valid);
    followRef.current = true; setFollowing(true); autoCam.current = 0;
    setCamX(0);
    const deck = [...PERSONALITIES].sort(() => Math.random() - 0.5);
    hRef.current = valid.map((_, i) => {
      const personality = deck[i] ?? PERSONALITIES[0];
      return { x: START, state: "normal", next: 0.6 + Math.random() * 0.6, base: (personality?.base ?? 170) + Math.random() * 12 - 6, kick: personality?.kick ?? 1.45 };
    });
    setHorses([...hRef.current]);
    setOrder([]);
    void soundRef.current?.playClip("launch");
    setPhase("pan");
  }

  // pan finish -> start
  useEffect(() => {
    if (phase !== "pan") return;
    let raf = 0; const t0 = performance.now(); const D = 2600;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / D);
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      moveCamera(maxCam * (1 - e));
      if (p < 1) raf = requestAnimationFrame(step); else { setCount(3); setPhase("countdown"); }
    };
    moveCamera(maxCam);
    const id = setTimeout(() => (raf = requestAnimationFrame(step)), 700);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, [phase, maxCam]);

  // The replacement countdown is one complete three-second clip.
  useEffect(() => {
    if (phase !== "countdown") return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    void (async () => {
      await soundRef.current?.playClip("countdown");
      if (cancelled) return;
      timers.push(setTimeout(() => setCount(2), 1000));
      timers.push(setTimeout(() => setCount(1), 2000));
      timers.push(setTimeout(() => setCount(0), 3000));
      timers.push(setTimeout(() => setPhase("race"), 3100));
    })();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "race") return;
    soundRef.current?.syncRace(hRef.current.map((h) => h.state), true);
    let raf = 0; let last = performance.now(); let t = 0; let camR = -1;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const hs = hRef.current;
      const ranked = [...hs].sort((a, b) => b.x - a.x);
      const leader = ranked[0]!, lastH = ranked[ranked.length - 1]!;
      const rubber = rubberBandActive(leader.x, lastH.x, vw);
      for (let i = 0; i < hs.length; i++) {
        const h = hs[i]!;
        const prog = (h.x - START) / (FINISH - START);
        const leadP = (leader.x - START) / (FINISH - START);
        // chaos phase follows the leader so trailing horses still get gadgets; final purge stays per-horse
        const act = directorPhase(prog) === "finish" ? "finish" : directorPhase(leadP) === "setup" ? "setup" : "rubber";
        const rank = ranked.indexOf(h);
        if (act === "finish") {
          const purged = crashFinish(finishPurge(h.state), prog);
          if (purged !== h.state) {
            const crashed = purged === "exploded" || purged === "wiped";
            h.state = purged; h.line = undefined; h.panic = false;
            h.next = t + (crashed ? 99 : 0); // crashes slide all the way over the line
            if (crashed) { soundRef.current?.play(purged); if (purged === "exploded") punchShake(); }
          } else if (t > h.next && PANIC_POOL.includes(h.state) && h.state !== "rocket" && h.state !== "skate") {
            // non-mount boosts finish their normal run time, then the horse sprints
            h.state = "normal"; h.line = undefined; h.panic = false;
          }
        } else if (t > h.next) {
          if (h.state !== "normal") {
            // states expire; ridden mounts still blow up mid-race
            const crash = h.state === "rocket" ? "exploded" : h.state === "skate" ? "wiped" : "normal";
            h.state = crash; h.line = undefined; h.panic = false;
            h.next = t + (crash === "normal" ? 0.6 + Math.random() * 0.6 : durationFor(crash));
            if (crash !== "normal") { soundRef.current?.play(crash); if (crash === "exploded") punchShake(); }
          } else if (act === "rubber" && rubber) {
            let s: HorseState = "normal"; let line: string | undefined;
            if (h === leader) { s = leaderCurse(Math.random); line = pick(CURSE_BUBBLES[s] ?? CURSE_LINES); }
            else if (h === lastH) { s = underdogPanic(Math.random, h.lastBoost); line = SELF_SPEED.includes(s) ? STATE_INFO[s].bubble : pick(PANIC_LINES); h.panic = true; }
            else if (rank >= 1 && Math.random() < 0.5) { s = midPackChaos(Math.random, h.lastBoost); if (SELF_SPEED.includes(s)) line = STATE_INFO[s].bubble; }
            if (PANIC_POOL.includes(s)) h.lastBoost = s;
            if (s === "lunge") h.lungeAt = t + 0.2;
            h.state = s; h.line = line;
            h.next = t + (s === "normal" ? 0.5 : s === "biped" ? 2.2 : durationFor(s));
            if (s !== "normal") { soundRef.current?.play(s); if (s === "glassdoor") punchShake(); }
          }
        }
        if (h.state === "exploded") h.burnt = true;
        if (h.state === "wiped") h.bruised = true;
        const sliding = act === "finish" && (h.state === "exploded" || h.state === "wiped");
        if (h.state === "lunge" && h.lungeAt !== undefined && t >= h.lungeAt) {
          // hold the deep lunge, then snap forward instantly
          h.x += vw * LUNGE_SNAP; h.lungeAt += LUNGE_EVERY;
        }
        const v = h.panic && !SELF_SPEED.includes(h.state) ? h.base * PANIC_SPEED : sliding ? h.base * 1.3 : speedFor(h.state, t + i, h.base, prog, h.kick);
        h.x = Math.max(START - 40, h.x + v * dt);
        if (h.x >= FINISH) {
          // climax: the first nose over the line freezes everyone else
          h.finish = t; h.state = "normal"; h.line = undefined; h.panic = false;
          soundRef.current?.syncRace([], false);
          soundRef.current?.play("victory");
          const fin = [i, ...hs.map((_, k) => k).filter((k) => k !== i).sort((a, b) => hs[b]!.x - hs[a]!.x)];
          setOrder(fin);
          setHorses(hs.map((x) => ({ ...x })));
          setPhase("climax");
          return;
        }
      }
      soundRef.current?.syncRace(hs.map((h) => h.state), true);
      setHorses(hs.map((h) => ({ ...h })));
      // Steady forward-follow at a fixed scale; never zoom with pack spacing.
      const target = Math.min(maxCam, Math.max(0, leader.x - vw * 0.6));
      const forward = forwardCamera(Math.max(0, camR), target, maxCam);
      camR = camR < 0 ? forward : camR + (forward - camR) * Math.min(1, dt * 6);
      moveCamera(camR);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); soundRef.current?.syncRace([], false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // climax: winner walks forward at 150%, losers stay frozen, then the podium appears
  useEffect(() => {
    if (phase !== "climax") return;
    let raf = 0; let last = performance.now();
    const w = order[0];
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const h = w !== undefined ? hRef.current[w] : undefined;
      if (h) { h.x = Math.min(TRACK - 320, h.x + 60 * dt); setHorses(hRef.current.map((x) => ({ ...x }))); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const id = setTimeout(() => setPhase("done"), 3200);
    return () => { cancelAnimationFrame(raf); clearTimeout(id); };
  }, [phase, order]);

  if (phase === "setup") {
    return (
      <main className="min-h-screen grass-bg flex items-center justify-center p-4">
        <div className="cartoon-card w-full max-w-lg p-6">
          <div className="flex justify-end mb-2">{soundToggle}</div>
          <h1 className="font-display text-5xl text-center text-primary">Derby Decider</h1>
          <p className="text-center text-muted-foreground mt-1">Can't decide? Let the horses race for it.</p>
          <div className="mt-6 space-y-3">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full border-[3px] border-ink shrink-0" style={{ background: COATS[i] }} />
                <input value={c} maxLength={30} placeholder={`Choice ${i + 1}`}
                  onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))}
                  className="flex-1 rounded-xl border-[3px] border-ink bg-card px-3 py-2 font-bold outline-none focus:ring-4 ring-accent" />
                {choices.length > 2 && (
                  <button onClick={() => setChoices(choices.filter((_, j) => j !== i))} aria-label="Remove"
                    className="cartoon-btn bg-secondary px-3 py-2">✕</button>
                )}
              </div>
            ))}
          </div>
          {choices.length < 5 && (
            <button onClick={() => setChoices([...choices, ""])} className="mt-3 w-full rounded-xl border-[3px] border-dashed border-ink py-2 font-bold text-muted-foreground">+ Add choice</button>
          )}
          <button disabled={valid.length < 2} onClick={start} className="cartoon-btn mt-6 w-full bg-primary text-primary-foreground py-3 text-2xl font-display disabled:opacity-50">
            And they're off! 🏁
          </button>
          {valid.length < 2 && <p className="text-center text-sm mt-2 text-muted-foreground">Enter at least 2 choices.</p>}
        </div>
      </main>
    );
  }

  const winner = order[0];
  const ranks = horses.map((_, i) => i).sort((a, b) => {
    const fa = order.indexOf(a), fb = order.indexOf(b);
    if (fa >= 0 || fb >= 0) return (fa < 0 ? 99 : fa) - (fb < 0 ? 99 : fb);
    return horses[b]!.x - horses[a]!.x;
  });
  const leadProg = horses.length ? (Math.max(...horses.map((h) => h.x)) - START) / (FINISH - START) : 0;
  const sprinting = phase === "race" && leadProg >= SPRINT_AT && order.length === 0;
  const SUF = ["st", "nd", "rd", "th", "th"];
  const STATE_CHIP: Record<HorseState, string> = { normal: "bg-secondary text-ink", turbo: "bg-accent text-ink", drunk: "bg-primary text-primary-foreground", tired: "bg-muted text-ink", moonwalk: "bg-accent text-ink", wrongway: "bg-primary text-primary-foreground", stumble: "bg-primary text-primary-foreground", graze: "bg-secondary text-ink", nap: "bg-muted text-ink", zoomies: "bg-accent text-ink", biped: "bg-accent text-ink", winded: "bg-muted text-ink", rocket: "bg-accent text-ink", ufo: "bg-primary text-primary-foreground", skate: "bg-accent text-ink", exploded: "bg-primary text-primary-foreground", wiped: "bg-primary text-primary-foreground", timeout: "bg-muted text-ink", standby: "bg-secondary text-ink", smash: "bg-accent text-ink", glassdoor: "bg-primary text-primary-foreground", soup: "bg-secondary text-ink", tactile: "bg-accent text-ink", jet: "bg-accent text-ink", scuba: "bg-secondary text-ink", laksa: "bg-primary text-primary-foreground", copter: "bg-accent text-ink", lunge: "bg-accent text-ink" };
  return (
    <main className="min-h-screen grass-bg flex flex-col">
      <header className="flex items-center justify-between gap-3 flex-wrap px-4 py-3">
        <h1 className="font-display text-3xl text-primary-foreground" style={{ WebkitTextStroke: "2px var(--ink)" }}>Derby Decider</h1>
        <div className="flex gap-2 items-center flex-wrap">
        {!following && <Button variant="secondary" className="cartoon-btn" onClick={resumeFollow}><Crosshair /> Snap to leader</Button>}
        {soundToggle}
        <span className={`font-display text-xl px-3 py-1 rounded-full border-[3px] border-ink ${sprinting ? "bg-primary text-primary-foreground sprint-glow" : "bg-card text-ink"}`}>
          {phase === "pan" ? "Surveying the track…" : phase === "countdown" ? "Get ready…" : sprinting ? "🔥 FINAL SPRINT!" : phase === "race" ? "Race on!" : "Finished!"}
        </span>
        </div>
      </header>
      <div className="flex flex-1 px-2 pb-4 gap-3">
        {/* tote board */}
        <aside className="tote w-40 sm:w-56 shrink-0 self-start p-2">
          <div className="font-display text-center text-accent text-lg h-[116px] flex items-center justify-center tracking-widest">TOTE BOARD</div>
          {choices.map((c, i) => {
            const h = horses[i]; const rank = ranks.indexOf(i); const done = phase === "climax" ? order[0] === i : order.includes(i);
            return (
              <div key={i} className="h-[150px] flex items-center">
                <div className="tote-row w-full p-2">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 shrink-0 rounded-lg border-[3px] border-ink font-display text-xl flex items-center justify-center text-ink" style={{ background: COATS[i] }}>{i + 1}</span>
                    <div className="font-bold truncate flex-1">{c}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className={`font-display text-2xl ${rank === 0 ? "text-accent" : ""}`}>{rank >= 0 && phase !== "pan" && phase !== "countdown" ? `${rank + 1}${SUF[rank]}` : "—"}</span>
                    {h && (phase === "race" || phase === "climax") && !done && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border-2 border-ink ${STATE_CHIP[h.state]} ${h.state === "drunk" ? "horse-wobble" : ""}`}>
                        {STATE_INFO[h.state].emoji} {STATE_INFO[h.state].label}
                      </span>
                    )}
                    {done && <span className="text-xs font-bold px-2 py-0.5 rounded-full border-2 border-ink bg-accent text-ink">🏁 Finished</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </aside>
        {/* track column: mini-map + viewport */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 self-start">
        {/* mini-map: color-coded dots inch toward the finish */}
        <div className="relative h-7 rounded-full border-[3px] border-ink bg-board/90 mx-1" aria-label="Race progress map">
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-sm">🏁</span>
          {horses.map((h, i) => (
            <span key={i} className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-ink transition-[left] duration-100"
              style={{ left: `calc(${Math.min(1, Math.max(0, (h.x - START) / (FINISH - START))) * 96}% + 4px)`, background: COATS[i] }} />
          ))}
        </div>
        <div ref={viewRef} aria-label="Race track" tabIndex={0} className={`race-scroll ${phase === "climax" || shake ? "screen-shake" : ""} relative min-w-0 self-start w-full overflow-x-auto overflow-y-hidden rounded-2xl border-[4px] border-ink`} style={{ height: 116 + choices.length * 150 + 26 + 18 }}
          onKeyDown={(e) => { if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(e.key)) pauseFollow(); }}
          onWheel={(e) => { pauseFollow(); if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && viewRef.current) { viewRef.current.scrollLeft += e.deltaY; } }}
          onPointerDown={(e) => {
            pauseFollow();
            if (e.pointerType !== "mouse" || e.button !== 0 || phase === "pan" || phase === "countdown") return;
            const bounds = e.currentTarget.getBoundingClientRect();
            if (e.clientY >= bounds.bottom - 20) return;
            dragRef.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => { const drag = dragRef.current; if (drag) e.currentTarget.scrollLeft = drag.scroll + drag.x - e.clientX; }}
          onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
          {/* parallax layer 1: far sky drifts at 0.1x */}
          <div className="sky-bg pointer-events-none absolute top-0 h-[64px] z-0 border-b-[3px] border-ink" style={{ left: camX * 0.9, width: vw + 200 }} />
          {/* parallax layer 2: treeline midground at 0.5x */}
          <div className="treeline-bg pointer-events-none absolute top-[26px] h-[38px] z-0" style={{ left: camX * 0.5, width: vw + 200 }} />
          {/* live leaderboard, auto-sorted by track position */}
          {(phase === "race" || phase === "climax") && (
            <div className="absolute top-[60px] z-[90] rounded-xl border-[3px] border-ink bg-ink/70 px-3 py-2 pointer-events-none" style={{ left: camX + vw - 190, width: 178 }}>
              <div className="font-display text-[11px] tracking-widest text-accent mb-1">LIVE STANDINGS</div>
              {ranks.map((hi, r) => (
                <div key={hi} className="flex items-center gap-1.5 text-xs font-bold text-gate leading-5">
                  <span className="w-4">{r + 1}.</span>
                  <span className="h-3 w-3 rounded-full border border-ink shrink-0" style={{ background: COATS[hi] }} />
                  <span className="truncate">{choices[hi]}</span>
                </div>
              ))}
            </div>
          )}
          <div className="relative" style={{ width: TRACK, height: 116 + choices.length * 150 + 26 }}>
            <div className="h-[64px]" />
            <div className="h-[26px] crowd-bg" />
            <div className="relative h-[26px] rail"><div className="absolute inset-x-0 -bottom-[18px] h-[18px] bunting z-10" /></div>
            {choices.map((_, i) => (
              <div key={i} className="relative h-[150px] track-sand border-b-[3px] border-dashed border-track-line">
                {[0, 700, 1400].map((x) => (
                  <span key={x} className="absolute bottom-2 font-display text-4xl text-gate/50" style={{ left: START + 260 + x }}>{i + 1}</span>
                ))}
              </div>
            ))}
            <div className="h-[26px] rail" />
            {/* distance markers */}
            {[0.25, 0.5, SPRINT_AT].map((p) => {
              const x = START + 200 + (FINISH - START) * p;
              return (
                <div key={p} className="absolute top-[90px] z-10 flex flex-col items-center" style={{ left: x }}>
                  <span className={`font-display text-sm px-2 rounded border-2 border-ink ${p === SPRINT_AT ? "bg-primary text-primary-foreground" : "bg-card text-ink"}`}>
                    {p === SPRINT_AT ? "SPRINT!" : `${Math.round((1 - p) * 400)}m`}
                  </span>
                </div>
              );
            })}
            {/* starting stalls */}
            <StartingGate lanes={choices.length} left={START} top={116} open={(phase === "countdown" && count === 0) || phase === "race" || phase === "climax" || phase === "done"} />
            {/* finish arch */}
            <div className="absolute top-[116px] w-5 finish-line" style={{ left: FINISH + 186, height: choices.length * 150 }} />
            <div className="absolute top-[66px] z-20 font-display text-xl text-ink bg-accent border-[3px] border-ink px-3 rounded-lg" style={{ left: FINISH + 140 }}>🏁 FINISH</div>
            <div className="absolute top-[90px] bottom-0 w-3 bg-gate border-x-2 border-ink z-0" style={{ left: FINISH + 170 }} />
            <div className="absolute top-[90px] bottom-0 w-3 bg-gate border-x-2 border-ink z-0" style={{ left: FINISH + 214 }} />
            {horses.map((h, i) => (
              <div key={i} className="absolute z-30" style={{ top: 116 + i * 150 + 22, left: h.x, transition: "none" }}>
                <HorseActor h={h} i={i} phase={phase} />
              </div>
            ))}
            {/* one spotlight per horse during the countdown */}
            {phase === "countdown" && <div className="pointer-events-none absolute inset-0 z-[25] bg-ink/55" />}
            {phase === "countdown" && choices.map((_, i) => (
              <div key={`spot-${i}`} className="lane-spot pointer-events-none absolute z-[35]" style={{ left: START - 30, top: 116 + i * 150 - 40, width: 260, height: 190 }} />
            ))}
          </div>
          {/* parallax layer 4: blurred foreground rail whips past at 1.5x */}
          <div className="fg-rail pointer-events-none absolute bottom-0 h-[46px] z-[80]" style={{ left: camX * 0.5 - 100, width: vw + 400 }} />
          {phase === "climax" && winner !== undefined && (
            <div className="absolute top-0 bottom-0 z-[100] flex items-center justify-center pointer-events-none p-4" style={{ left: viewRef.current?.scrollLeft ?? 0, width: viewRef.current?.clientWidth ?? "100%" }}>
              <div className="decision-slam cartoon-card bg-accent px-6 py-4 text-center">
                <div className="font-display text-2xl sm:text-3xl text-ink">THE DECISION IS MADE:</div>
                <div className="font-display text-5xl sm:text-7xl text-primary break-words">{choices[winner]}</div>
              </div>
            </div>
          )}
          {phase === "countdown" && (
            <div className="absolute top-0 bottom-0 z-[100] pointer-events-none" style={{ left: viewRef.current?.scrollLeft ?? 0, width: viewRef.current?.clientWidth ?? "100%" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="flex gap-3 rounded-2xl border-[4px] border-ink bg-ink/80 px-5 py-4">
                  {[3, 2, 1].map((n) => (
                    <span key={n} className="h-10 w-10 rounded-full border-[3px] border-ink" style={{ background: count >= n ? "var(--destructive)" : "var(--board-2)" }} />
                  ))}
                  <span className="h-10 w-10 rounded-full border-[3px] border-ink" style={{ background: count === 0 ? "var(--grass)" : "var(--board-2)" }} />
                </div>
                {count === 0 && <span className="font-display text-8xl text-accent countdown-pop drop-shadow">GO!</span>}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {phase === "done" && winner !== undefined && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-[200]">
          <Confetti />
          <div className="cartoon-card relative w-full max-w-lg p-6 text-center">
            <div className="flex justify-end mb-2">{soundToggle}</div>
            <p className="font-bold text-muted-foreground">The horses have decided…</p>
            <h2 className="font-display text-5xl text-primary mt-1 break-words">{choices[winner]}</h2>
            <div className="flex items-end justify-center gap-3 mt-6">
              {[1, 0, 2].map((p) => order[p] !== undefined && (
                <div key={p} className="flex flex-col items-center w-28">
                  <Horse color={COATS[order[p]!]!} anim={p === 0 ? "jump" : "idle"} size={110} />
                  <div className="text-sm font-bold truncate w-full">{choices[order[p]]}</div>
                  <div className="w-full rounded-t-lg border-[3px] border-ink bg-secondary font-display text-3xl flex items-center justify-center"
                    style={{ height: p === 0 ? 96 : p === 1 ? 66 : 44, background: p === 0 ? "var(--gold)" : undefined }}>{p + 1}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button onClick={start} className="cartoon-btn h-auto bg-primary text-primary-foreground py-3 font-display text-xl">Race again</Button>
              <Button variant="secondary" onClick={() => setPhase("setup")} className="cartoon-btn h-auto py-3 font-display text-xl">Edit choices</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function HorseActor({ h, i, phase }: { h: H; i: number; phase: Phase }) {
  const frozen = phase === "climax" && h.finish === undefined;
  const champ = phase === "climax" && h.finish !== undefined;
  const racing = (phase === "race" || phase === "climax") && h.finish === undefined;
  const st: HorseState = racing ? h.state : "normal";
  const vis: HorseState = st === "turbo" || st === "drunk" || st === "tired" || st === "nap" ? st : st === "zoomies" ? "turbo" : "normal";
  const boost = st === "jet" || st === "scuba" || st === "laksa" || st === "copter" || st === "lunge";
  const curse = st === "timeout" || st === "standby" || st === "smash" || st === "glassdoor" || st === "soup" || st === "tactile";
  const anim = curse || boost ? st : st === "biped" ? "biped" : st === "winded" ? "walk" : st === "nap" || st === "exploded" ? "sleep" : st === "wiped" ? "stumble" : st === "stumble" ? "stumble" : st === "graze" ? "graze" : st === "skate" ? "surf" : st === "ufo" ? "idle" : st === "rocket" ? "rocket" : champ ? "walk" : phase === "race" || frozen ? (h.finish !== undefined ? (h.x > TRACK - 300 ? "walk" : "gallop") : st === "turbo" || st === "zoomies" || (st === "normal" && (h.x - START) / (FINISH - START) >= SPRINT_AT) ? "sprint" : st === "tired" || st === "moonwalk" ? "walk" : "gallop") : "idle";
  const flip = st === "wrongway";
  const wrap = st === "ufo" ? "fx-abduct" : st === "zoomies" ? "fx-zoom" : st === "moonwalk" ? "fx-moon" : "";
  const bubble = racing ? (h.line ?? STATE_INFO[st].bubble) : h.finish !== undefined && phase === "race" ? ["Yay!", "Woo!", "Carrots pls", "I'm famous!"][i % 4] : undefined;
  return (
    <div className={`relative ${frozen ? "fx-frozen" : ""}`} style={champ ? { transform: "scale(1.5)", transformOrigin: "50% 100%", transition: "transform .4s ease-out" } : undefined}>
      <div className={st === "exploded" ? "fx-launch" : st === "wiped" ? "fx-tumble" : st === "rocket" ? "fx-rumble" : ""}>
        <div className={wrap} style={{ transform: flip ? "scaleX(-1)" : st === "rocket" ? "rotate(-5deg)" : undefined, filter: h.burnt ? "brightness(0.45) sepia(0.6) saturate(0.6)" : undefined }}>
          <div style={{ transform: st === "timeout" ? "perspective(700px) rotateX(78deg)" : undefined, transformOrigin: "50% 92%", transition: "transform 1.1s ease-in" }}>
            <Horse color={st === "laksa" ? "var(--destructive)" : COATS[i]!} state={vis} anim={anim} bruised={!!h.bruised} frozen={frozen} />
          </div>
        </div>
      </div>
      {st === "rocket" && [0, 1, 2].map((k) => <span key={k} className="fx-speedline absolute h-[4px] rounded-full bg-card" style={{ left: -60 - k * 20, top: 100 + k * 14, width: 70 - k * 12, animationDelay: `${k * 0.12}s` }} />)}
      {(st === "jet" || st === "laksa") && [0, 1, 2, 3].map((k) => <span key={k} className="fx-speedline absolute h-[3px] rounded-full bg-card" style={{ left: -70 - k * 18, top: 50 + k * 18, width: 90 - k * 10, animationDelay: `${k * 0.1}s` }} />)}
      {anim === "sprint" && [0, 1, 2].map((k) => <span key={k} className="fx-dust hoof-dust absolute h-3 w-4" style={{ left: 30 + k * 46, top: 126, animationDelay: `${k * 0.14}s` }} />)}
      {st === "timeout" && <span className="fx-spin absolute left-[150px] top-[10px] h-9 w-9 rounded-full border-[5px] border-ink/20 border-t-ink" />}
      {st === "exploded" && <RocketBurst />}
      {st === "wiped" && <BoardBreak />}
      {h.burnt && <><span className="absolute left-[70px] top-[0px] text-2xl fx-smoke">💨</span><span className="absolute left-[130px] top-[10px] text-xl fx-smoke" style={{ animationDelay: ".7s" }}>💨</span></>}
      {st === "stumble" && <span className="absolute left-[150px] top-[120px] text-2xl fx-dust">💨</span>}
      {st === "graze" && <span className="absolute left-[170px] top-[60px] text-2xl fx-float">🦋</span>}
      {st === "nap" && <span className="absolute left-[150px] -top-2 text-2xl fx-float">💤</span>}
      {st === "moonwalk" && <span className="absolute -left-6 top-[90px] text-2xl">✨</span>}
      {st === "ufo" && <span className="absolute left-[60px] -top-16 text-5xl fx-float">🛸</span>}
      {st === "ufo" && <span className="absolute left-[50px] -top-4 h-[180px] w-[110px] rounded-b-full bg-accent/30 pointer-events-none" style={{ clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)" }} />}
      {st === "wrongway" && <span className="absolute left-[170px] top-6 text-3xl fx-float">❓</span>}
      {bubble && (
        <span className="absolute -top-3 left-[110px] whitespace-nowrap rounded-full border-[3px] border-ink bg-card px-2 font-display text-sm text-ink">{bubble}</span>
      )}
    </div>
  );
}

/** Rocket blows apart: hull pieces fly off, a cartoon smoke cloud pops, the horse is flung and lands flat. */
function RocketBurst() {
  const pieces = [
    { clip: "inset(0 0 0 68%)", dx: "220px", dy: "-160px", rot: "320deg" },
    { clip: "inset(0 34% 0 32%)", dx: "40px", dy: "-220px", rot: "-200deg" },
    { clip: "inset(0 66% 0 0)", dx: "-200px", dy: "-120px", rot: "-340deg" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {pieces.map((p, k) => (
        <img key={k} src={rocketArt} alt="" width={1152} height={576} className="fx-debris absolute left-[-12px] top-[36px] w-[240px]"
          style={{ clipPath: p.clip, ["--dx" as string]: p.dx, ["--dy" as string]: p.dy, ["--rot" as string]: p.rot }} />
      ))}
      <svg viewBox="0 0 200 140" className="fx-boom absolute left-[-20px] top-[-10px] w-[240px] overflow-visible">
        <path d="M30 90 Q10 70 34 56 Q30 28 62 34 Q74 8 104 24 Q130 6 146 34 Q182 30 172 62 Q196 80 168 98 Q166 122 132 112 Q112 132 86 114 Q54 128 48 104 Q22 110 30 90 Z"
          fill="var(--card)" stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round" />
        <text x="100" y="82" textAnchor="middle" fontSize="30" fontWeight="900" fill="var(--ink)" fontFamily="var(--font-display, inherit)">KA-BOOM!</text>
      </svg>
    </div>
  );
}

/** Hoverboard snaps in half: the two halves spin away with a CRACK. */
function BoardBreak() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <img src={hoverArt} alt="" width={1152} height={576} className="fx-debris absolute left-[-12px] top-[74px] w-[224px]"
        style={{ clipPath: "inset(0 50% 0 0)", ["--dx" as string]: "-120px", ["--dy" as string]: "40px", ["--rot" as string]: "-120deg" }} />
      <img src={hoverArt} alt="" width={1152} height={576} className="fx-debris absolute left-[-12px] top-[74px] w-[224px]"
        style={{ clipPath: "inset(0 0 0 50%)", ["--dx" as string]: "140px", ["--dy" as string]: "30px", ["--rot" as string]: "150deg" }} />
      <span className="fx-boom absolute left-[70px] top-[60px] font-display text-3xl text-ink" style={{ WebkitTextStroke: "1px var(--card)" }}>CRACK!</span>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((i) => (
        <span key={i} className="confetti" style={{
          left: `${(i * 37) % 100}%`, background: COATS[i % 5],
          animationDelay: `${(i % 10) * 0.15}s`, animationDuration: `${2 + (i % 5) * 0.4}s`,
        }} />
      ))}
    </div>
  );
}
