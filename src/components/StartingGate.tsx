// Illustrated 2.5D derby starting stalls with doors that swing open left/right.
type Props = { lanes: number; left: number; open: boolean; laneH?: number; top?: number };

const DEPTH = 230; // stall length (horse stands inside)

export function StartingGate({ lanes, left, open, laneH = 150, top = 52 }: Props) {
  const h = lanes * laneH;
  return (
    <>
      {/* stall floor shading (behind horses) */}
      <div className="absolute z-[1] pointer-events-none" style={{ left, top, width: DEPTH, height: h }}>
        {Array.from({ length: lanes }, (_, i) => (
          <div key={i} className="absolute inset-x-0 gate-floor" style={{ top: i * laneH, height: laneH }} />
        ))}
      </div>
      {/* frame in front of horses */}
      <div className="absolute z-10 pointer-events-none" style={{ left, top: top - 44, width: DEPTH + 24, height: h + 60 }}>
        {/* roof canopy */}
        <div className="absolute -left-2 -right-2 top-0 h-[30px] gate-roof rounded-t-lg border-[3px] border-ink" />
        <div className="absolute left-0 right-0 top-[27px] h-[12px] gate-truss border-x-[3px] border-b-[3px] border-ink" />
        {/* dividers between stalls */}
        {Array.from({ length: lanes + 1 }, (_, i) => (
          <div key={i} className="absolute left-0 h-[10px] gate-divider border-[2px] border-ink rounded-full"
            style={{ top: 44 + i * laneH - 5, width: DEPTH + 16 }} />
        ))}
        {/* back + front posts */}
        <div className="absolute top-[30px] bottom-[6px] left-0 w-[14px] gate-post border-[3px] border-ink rounded-sm" />
        <div className="absolute top-[30px] bottom-[6px] w-[16px] gate-post border-[3px] border-ink rounded-sm" style={{ left: DEPTH }} />
        {/* wheels */}
        <div className="absolute bottom-0 left-[-6px] w-[26px] h-[26px] rounded-full gate-wheel border-[3px] border-ink" />
        <div className="absolute bottom-0 w-[26px] h-[26px] rounded-full gate-wheel border-[3px] border-ink" style={{ left: DEPTH - 6 }} />
        {/* stall numbers */}
        {Array.from({ length: lanes }, (_, i) => (
          <div key={i} className="absolute font-display text-lg leading-none text-ink bg-accent border-[3px] border-ink rounded-md px-1.5 py-0.5 gate-badge"
            style={{ top: 44 + i * laneH + 8, left: DEPTH - 34 }}>{i + 1}</div>
        ))}
      </div>
      {/* doors: two leaves per stall, hinged on outer edges, swing open in 3D */}
      <div className="absolute z-[11] pointer-events-none" style={{ left: left + DEPTH + 2, top, width: 14, height: h, perspective: 500 }}>
        {Array.from({ length: lanes }, (_, i) => (
          <div key={i} className="absolute left-0 w-full" style={{ top: i * laneH + 6, height: laneH - 12, transformStyle: "preserve-3d" }}>
            <div className="gate-door absolute inset-x-0 top-0 h-1/2 border-[3px] border-ink rounded-t-md origin-top"
              style={{ transform: open ? "rotateX(-80deg) translateY(-6px)" : "none", transitionDelay: `${i * 30}ms` }} />
            <div className="gate-door absolute inset-x-0 bottom-0 h-1/2 border-[3px] border-ink rounded-b-md origin-bottom"
              style={{ transform: open ? "rotateX(80deg) translateY(6px)" : "none", transitionDelay: `${i * 30}ms` }} />
          </div>
        ))}
      </div>
    </>
  );
}
