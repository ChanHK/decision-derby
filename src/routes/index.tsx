import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Horse } from "@/components/Horse";
import { StartingGate } from "@/components/StartingGate";
import { Button } from "@/components/ui/button";
import { Crosshair, Volume2, VolumeX } from "lucide-react";
import { RaceSound } from "@/lib/race-sound";
import { PERSONALITIES, SPRINT_AT, STATE_INFO, bipedDone, burnoutState, chaserState, durationFor, rollBiped, forwardCamera, randomState, speedFor, shouldBump, draftBoost, RIVAL_LINES, type HorseState } from "@/lib/race";

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

type Phase = "setup" | "pan" | "countdown" | "race" | "done";
type H = { x: number; state: HorseState; next: number; base: number; kick: number; finish?: number; chase?: number | undefined; bipedAt?: number; bumpCd?: number; line?: string };

function Index() {
  const [choices, setChoices] = useState<string[]>(["Pizza", "Sushi", "Tacos"]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(3);
  const [horses, setHorses] = useState<H[]>([]);
  const [following, setFollowing] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const followRef = useRef(true);
  const autoCam = useRef(0);
  const soundRef = useRef<RaceSound | null>(null);
  const dragRef = useRef<{ x: number; scroll: number } | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [vw, setVw] = useState(1000);
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
    if (followRef.current && viewRef.current) viewRef.current.scrollLeft = x;
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
    setChoices(valid);
    followRef.current = true; setFollowing(true); autoCam.current = 0;
    const deck = [...PERSONALITIES].sort(() => Math.random() - 0.5);
    hRef.current = valid.map((_, i) => {
      const personality = deck[i] ?? PERSONALITIES[0];
      return { x: START, state: "normal", next: 0.6 + Math.random() * 0.6, base: (personality?.base ?? 170) + Math.random() * 12 - 6, kick: personality?.kick ?? 1.45 };
    });
    setHorses([...hRef.current]);
    setOrder([]);
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

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { const id = setTimeout(() => setPhase("race"), 600); return () => clearTimeout(id); }
    const id = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "race") return;
    let raf = 0; let last = performance.now(); let t = 0; let camR = -1; const fin: number[] = []; let doneAt = -1;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const unfinished = hRef.current.filter((h) => h.finish === undefined);
      const leaderX = Math.max(...unfinished.map((h) => h.x));
      for (let i = 0; i < hRef.current.length; i++) {
        const h = hRef.current[i];
        if (!h) continue;
        if (h.finish !== undefined) {
          // victory lap: coast into the winner's circle and slow to a stop
          const room = Math.max(0, TRACK - 260 - h.x);
          h.x += Math.min(h.base * 1.4, room * 2) * dt;
          continue;
        }
        const prog = (h.x - START) / (FINISH - START);
        const leading = h.x === leaderX && prog >= 0.08 && unfinished.length > 1;
        const isLast = unfinished.length > 1 && h.x === Math.min(...unfinished.map((u) => u.x));
        const chased = h.chase !== undefined ? hRef.current[h.chase] : undefined;
        if (h.state === "biped" && (!chased || chased.finish !== undefined || bipedDone(h.x, chased.x))) {
          // the comeback burns it out too
          const crash = burnoutState(Math.random, "biped");
          h.state = crash ?? "winded"; h.chase = undefined; h.next = t + (crash ? durationFor(crash) : 2.2);
          soundRef.current?.play(h.state);
        } else if (h.state === "biped") {
          // keep running until it passes the horse it is chasing
        } else if (isLast && h.state === "normal" && t > (h.bipedAt ?? 0) && rollBiped(Math.random, isLast, prog)) {
          const aheadList = unfinished.filter((u) => u.x > h.x).sort((a, b) => a.x - b.x);
          const ahead = aheadList[Math.min(1, aheadList.length - 1)]; // overtake two horses
          if (ahead) { h.state = "biped"; h.chase = hRef.current.indexOf(ahead); h.next = t + 99; soundRef.current?.play("biped"); }
          else h.bipedAt = t + 1;
        } else if (isLast && h.state === "normal" && t > (h.bipedAt ?? 0)) {
          h.bipedAt = t + 1; // desperate horse re-checks every second
        } else if (t > h.next) {
          if (h.state !== "normal") {
            const crash = burnoutState(Math.random, h.state);
            const next = crash ?? "normal";
            h.state = next;
            h.next = t + (next === "normal" ? 0.8 + Math.random() * 0.8 : durationFor(next));
            soundRef.current?.play(next);
          }
          else {
            let s = leading ? randomState(Math.random, true) : chaserState(Math.random);
            if (prog < 0.08 && (s === "wrongway" || s === "moonwalk")) s = "normal";
            h.state = s;
            soundRef.current?.play(s);
            h.next = t + (s === "normal" ? 0.8 + Math.random() * 0.8 : durationFor(s));
          }
        }
        // rivalry: bump neighbours, draft behind rivals
        if (t > (h.bumpCd ?? 0) && (h.state === "normal" || h.state === "turbo" || h.state === "skate")) {
          for (let j = 0; j < hRef.current.length; j++) {
            const o = hRef.current[j];
            if (!o || o.finish !== undefined || j === i) continue;
            if (shouldBump(o.x - h.x, Math.abs(j - i), Math.random)) {
              const victim = o.x < h.x ? o : h; const bully = victim === o ? h : o;
              victim.state = "bumped"; victim.next = t + durationFor("bumped");
              bully.line = RIVAL_LINES[Math.floor(Math.random() * RIVAL_LINES.length)];
              victim.line = undefined;
              bully.bumpCd = t + 2.5; victim.bumpCd = t + 2.5;
              soundRef.current?.play("stumble");
              break;
            }
          }
          if (h.bumpCd === undefined || t > h.bumpCd) h.bumpCd = t + 0.4;
        }
        const ahead = Math.min(...unfinished.filter((u) => u.x > h.x).map((u) => u.x - h.x), 9999);
        const draft = h.state === "normal" ? draftBoost(ahead) : 1;
        if (h.line && t > (h.bumpCd ?? 0) - 1.5) h.line = undefined;
        h.x = Math.max(START - 40, h.x + speedFor(h.state, t + i, h.base, prog, h.kick) * draft * dt);
        if (h.x >= FINISH) { h.finish = t; h.state = "normal"; h.chase = undefined; if (!fin.length) soundRef.current?.play("victory"); fin.push(i); }
      }
      setHorses(hRef.current.map((h) => ({ ...h })));
      const lead = Math.min(FINISH + 400, Math.max(...hRef.current.map((h) => h.x)));
      const target = Math.min(maxCam, Math.max(0, lead - vw * 0.4));
      const forward = forwardCamera(Math.max(0, camR), target, maxCam);
      camR = camR < 0 ? forward : camR + (forward - camR) * Math.min(1, dt * 6);
      moveCamera(camR);
      if (fin.length === hRef.current.length) {
        if (doneAt < 0) { doneAt = t; setOrder([...fin]); }
        if (t - doneAt > 1.8) { setPhase("done"); return; }
      }
      if (fin.length && !order.length) setOrder([...fin]);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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
  const STATE_CHIP: Record<HorseState, string> = { normal: "bg-secondary text-ink", turbo: "bg-accent text-ink", drunk: "bg-primary text-primary-foreground", tired: "bg-muted text-ink", moonwalk: "bg-accent text-ink", wrongway: "bg-primary text-primary-foreground", stumble: "bg-primary text-primary-foreground", graze: "bg-secondary text-ink", nap: "bg-muted text-ink", zoomies: "bg-accent text-ink", biped: "bg-accent text-ink", winded: "bg-muted text-ink", rocket: "bg-accent text-ink", ufo: "bg-primary text-primary-foreground", skate: "bg-accent text-ink", bumped: "bg-primary text-primary-foreground" };
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
          <div className="font-display text-center text-accent text-lg h-[52px] flex items-center justify-center tracking-widest">TOTE BOARD</div>
          {choices.map((c, i) => {
            const h = horses[i]; const rank = ranks.indexOf(i); const done = order.includes(i);
            return (
              <div key={i} className="h-[150px] flex items-center">
                <div className="tote-row w-full p-2">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 shrink-0 rounded-lg border-[3px] border-ink font-display text-xl flex items-center justify-center text-ink" style={{ background: COATS[i] }}>{i + 1}</span>
                    <div className="font-bold truncate flex-1">{c}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className={`font-display text-2xl ${rank === 0 ? "text-accent" : ""}`}>{rank >= 0 && phase !== "pan" && phase !== "countdown" ? `${rank + 1}${SUF[rank]}` : "—"}</span>
                    {h && phase === "race" && !done && (
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
        {/* track viewport */}
        <div ref={viewRef} aria-label="Race track" tabIndex={0} className="race-scroll relative flex-1 min-w-0 self-start overflow-x-auto overflow-y-hidden rounded-2xl border-[4px] border-ink" style={{ height: 52 + choices.length * 150 + 26 + 18 }}
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
          <div className="relative" style={{ width: TRACK, height: 52 + choices.length * 150 + 26 }}>
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
                <div key={p} className="absolute top-[26px] z-10 flex flex-col items-center" style={{ left: x }}>
                  <span className={`font-display text-sm px-2 rounded border-2 border-ink ${p === SPRINT_AT ? "bg-primary text-primary-foreground" : "bg-card text-ink"}`}>
                    {p === SPRINT_AT ? "SPRINT!" : `${Math.round((1 - p) * 400)}m`}
                  </span>
                </div>
              );
            })}
            {/* starting stalls */}
            <StartingGate lanes={choices.length} left={START} open={phase === "race" || phase === "done"} />
            {/* finish arch */}
            <div className="absolute top-[52px] w-5 finish-line" style={{ left: FINISH + 186, height: choices.length * 150 }} />
            <div className="absolute top-[2px] z-20 font-display text-xl text-ink bg-accent border-[3px] border-ink px-3 rounded-lg" style={{ left: FINISH + 140 }}>🏁 FINISH</div>
            <div className="absolute top-[26px] bottom-0 w-3 bg-gate border-x-2 border-ink z-0" style={{ left: FINISH + 170 }} />
            <div className="absolute top-[26px] bottom-0 w-3 bg-gate border-x-2 border-ink z-0" style={{ left: FINISH + 214 }} />
            {horses.map((h, i) => (
              <div key={i} className="absolute z-30" style={{ top: 52 + i * 150 + 22, left: h.x, transition: "none" }}>
                <HorseActor h={h} i={i} phase={phase} />
              </div>
            ))}
          </div>
          {phase === "countdown" && (
            <div className="absolute top-0 bottom-0 z-[100] flex items-center justify-center pointer-events-none" style={{ left: viewRef.current?.scrollLeft ?? 0, width: viewRef.current?.clientWidth ?? "100%" }}>
              <span key={count} className="font-display text-9xl text-accent countdown-pop drop-shadow">{count || "GO!"}</span>
            </div>
          )}
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
  const racing = phase === "race" && h.finish === undefined;
  const st: HorseState = racing ? h.state : "normal";
  const vis: HorseState = st === "turbo" || st === "drunk" || st === "tired" || st === "nap" ? st : st === "zoomies" ? "turbo" : "normal";
  const anim = st === "biped" ? "biped" : st === "winded" ? "walk" : st === "nap" ? "sleep" : st === "stumble" ? "stumble" : st === "graze" ? "graze" : st === "skate" || st === "ufo" ? "idle" : st === "rocket" ? "sprint" : phase === "race" ? (h.finish !== undefined ? (h.x > TRACK - 300 ? "walk" : "gallop") : st === "turbo" || st === "zoomies" || (st === "normal" && (h.x - START) / (FINISH - START) >= SPRINT_AT) ? "sprint" : st === "tired" || st === "moonwalk" ? "walk" : "gallop") : "idle";
  const flip = st === "wrongway";
  const wrap = st === "ufo" ? "fx-float" : st === "bumped" ? "horse-wobble" : st === "zoomies" ? "fx-zoom" : st === "moonwalk" ? "fx-moon" : "";
  const bubble = racing ? (h.line ?? STATE_INFO[st].bubble) : h.finish !== undefined && phase === "race" ? ["Yay!", "Woo!", "Carrots pls", "I'm famous!"][i % 4] : undefined;
  return (
    <div className="relative">
      <div className={wrap} style={{ transform: flip ? "scaleX(-1)" : undefined }}>
        <Horse color={COATS[i]!} state={vis} anim={anim} />
      </div>
      {st === "stumble" && <span className="absolute left-[150px] top-[120px] text-2xl fx-dust">💨</span>}
      {st === "graze" && <span className="absolute left-[170px] top-[60px] text-2xl fx-float">🦋</span>}
      {st === "nap" && <span className="absolute left-[150px] -top-2 text-2xl fx-float">💤</span>}
      {st === "moonwalk" && <span className="absolute -left-6 top-[90px] text-2xl">✨</span>}
      {st === "rocket" && <span className="absolute -left-10 top-[60px] text-4xl" style={{ transform: "rotate(-135deg)" }}>🚀</span>}
      {st === "rocket" && <span className="absolute -left-20 top-[70px] text-3xl fx-dust">🔥</span>}
      {st === "skate" && <span className="absolute left-[50px] top-[150px] text-5xl">🛹</span>}
      {st === "skate" && <span className="absolute left-[140px] top-[30px] text-2xl">🕶️</span>}
      {st === "ufo" && <span className="absolute left-[60px] -top-16 text-5xl fx-float">🛸</span>}
      {st === "ufo" && <span className="absolute left-[50px] -top-4 h-[180px] w-[110px] rounded-b-full bg-accent/30 pointer-events-none" style={{ clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)" }} />}
      {st === "bumped" && <span className="absolute left-[120px] top-[40px] text-3xl">💢</span>}
      {st === "wrongway" && <span className="absolute left-[170px] top-6 text-3xl fx-float">❓</span>}
      {bubble && (
        <span className="absolute -top-3 left-[110px] whitespace-nowrap rounded-full border-[3px] border-ink bg-card px-2 font-display text-sm text-ink">{bubble}</span>
      )}
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
