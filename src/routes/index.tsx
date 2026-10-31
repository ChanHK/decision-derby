import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Horse } from "@/components/Horse";
import { SPRINT_AT, STATE_INFO, randomState, speedFor, type HorseState } from "@/lib/race";

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
const TRACK = 2600; // world px
const FINISH = 2200;
const START = 120;

type Phase = "setup" | "pan" | "countdown" | "race" | "done";
type H = { x: number; state: HorseState; next: number; base: number; finish?: number };

function Index() {
  const [choices, setChoices] = useState<string[]>(["Pizza", "Sushi", "Tacos"]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(3);
  const [horses, setHorses] = useState<H[]>([]);
  const [cam, setCam] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [vw, setVw] = useState(1000);
  const viewRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<H[]>([]);
  const valid = choices.map((c) => c.trim()).filter(Boolean);

  useEffect(() => {
    const m = () => setVw(viewRef.current?.clientWidth ?? 1000);
    m(); window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, [phase]);

  const maxCam = Math.max(0, TRACK - vw);

  function start() {
    if (valid.length < 2) return;
    setChoices(valid);
    hRef.current = valid.map(() => ({ x: START, state: "normal", next: 1 + Math.random() * 2, base: 150 + Math.random() * 20 }));
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
      setCam(maxCam * (1 - e));
      if (p < 1) raf = requestAnimationFrame(step); else { setCount(3); setPhase("countdown"); }
    };
    setCam(maxCam);
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
    let raf = 0; let last = performance.now(); let t = 0; const fin: number[] = [];
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      for (let i = 0; i < hRef.current.length; i++) {
        const h = hRef.current[i]!;
        if (h.finish !== undefined) { h.x += h.base * 1.6 * dt; continue; }
        const prog = (h.x - START) / (FINISH - START);
        if (t > h.next) { h.state = randomState(); if (prog >= SPRINT_AT && h.state === "tired") h.state = "turbo"; h.next = t + 1.2 + Math.random() * 2; }
        h.x = Math.max(START - 40, h.x + speedFor(h.state, t + i, h.base, prog) * dt);
        if (h.x >= FINISH) { h.finish = t; fin.push(i); }
      }
      setHorses(hRef.current.map((h) => ({ ...h })));
      const lead = Math.max(...hRef.current.map((h) => h.x));
      setCam(Math.min(maxCam, Math.max(0, lead - vw * 0.6)));
      if (fin.length === hRef.current.length) { setOrder([...fin]); setTimeout(() => setPhase("done"), 900); return; }
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
  const STATE_CHIP: Record<HorseState, string> = { normal: "bg-secondary text-ink", turbo: "bg-accent text-ink", drunk: "bg-primary text-primary-foreground", tired: "bg-muted text-ink" };
  return (
    <main className="min-h-screen grass-bg flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="font-display text-3xl text-primary-foreground" style={{ WebkitTextStroke: "2px var(--ink)" }}>Derby Decider</h1>
        <span className={`font-display text-xl px-3 py-1 rounded-full border-[3px] border-ink ${sprinting ? "bg-primary text-primary-foreground sprint-glow" : "bg-card text-ink"}`}>
          {phase === "pan" ? "Surveying the track…" : phase === "countdown" ? "Get ready…" : sprinting ? "🔥 FINAL SPRINT!" : phase === "race" ? "Race on!" : "Finished!"}
        </span>
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
        <div ref={viewRef} className="relative flex-1 self-start overflow-hidden rounded-2xl border-[4px] border-ink" style={{ height: 52 + choices.length * 150 + 26 }}>
          <div className="absolute top-0 left-0 h-full" style={{ width: TRACK, transform: `translateX(${-cam}px)` }}>
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
            {/* start gates */}
            <div className="absolute top-[52px] z-10" style={{ left: START + 212 }}>
              {choices.map((_, i) => (
                <div key={i} className="h-[150px] w-4 bg-gate border-x-[3px] border-ink transition-transform duration-500 origin-top"
                  style={{ transform: phase === "race" || phase === "done" ? "scaleY(0.05)" : "none" }} />
              ))}
            </div>
            {/* finish arch */}
            <div className="absolute top-[52px] w-5 finish-line" style={{ left: FINISH + 186, height: choices.length * 150 }} />
            <div className="absolute top-[2px] z-20 font-display text-xl text-ink bg-accent border-[3px] border-ink px-3 rounded-lg" style={{ left: FINISH + 140 }}>🏁 FINISH</div>
            <div className="absolute top-[26px] bottom-0 w-3 bg-gate border-x-2 border-ink z-0" style={{ left: FINISH + 170 }} />
            <div className="absolute top-[26px] bottom-0 w-3 bg-gate border-x-2 border-ink z-0" style={{ left: FINISH + 214 }} />
            {horses.map((h, i) => (
              <div key={i} className="absolute z-[5]" style={{ top: 52 + i * 150 + 22, left: h.x, transition: "none" }}>
                <Horse color={COATS[i]!} state={phase === "race" && h.finish === undefined ? h.state : "normal"} anim={phase === "race" ? "gallop" : phase === "done" ? "walk" : "idle"} />
              </div>
            ))}
          </div>
          {phase === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span key={count} className="font-display text-9xl text-accent countdown-pop drop-shadow">{count || "GO!"}</span>
            </div>
          )}
        </div>
      </div>

      {phase === "done" && winner !== undefined && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-20">
          <Confetti />
          <div className="cartoon-card relative w-full max-w-lg p-6 text-center">
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
              <button onClick={start} className="cartoon-btn bg-primary text-primary-foreground py-3 font-display text-xl">Race again</button>
              <button onClick={() => setPhase("setup")} className="cartoon-btn bg-secondary py-3 font-display text-xl">Edit choices</button>
            </div>
          </div>
        </div>
      )}
    </main>
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
