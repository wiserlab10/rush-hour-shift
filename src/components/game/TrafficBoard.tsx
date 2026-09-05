"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import {
  isOnPanel,
  lockInfo,
  panelColRange,
  panelRowRange,
  vehicleCells,
  worldBounds,
} from "@/lib/game/board";
import { legalSteps } from "@/lib/game/engine";
import type { GameState, PlayerColor, Vehicle } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Props = {
  state: GameState;
  player: PlayerColor;
  interactive: boolean;
  /** Remaining move cells; drag/tap cannot exceed this. Omit for slide (until blocked). */
  moveBudget?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStep: (vehicleId: string, dir: 1 | -1, steps?: number) => void;
  slideStops?: { steps: number; tipRow: number; tipCol: number }[];
  slideChosenSteps?: number;
  onPickSlide?: (vehicleId: string, steps: number) => void;
  /** End panels slide vertically only. */
  shiftInteractive?: {
    lockedLeft: boolean;
    lockedRight: boolean;
    chosen: "left" | "right" | null;
    onNudge: (side: "left" | "right", rows: 1 | -1) => void;
  };
};

export function TrafficBoard({
  state,
  player,
  interactive,
  moveBudget,
  selectedId,
  onSelect,
  onStep,
  slideStops = [],
  slideChosenSteps = 0,
  onPickSlide,
  shiftInteractive,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; cells: number } | null>(null);
  const locks = lockInfo(state);
  const bounds = worldBounds(state.leftShift, state.rightShift);

  const panels = useMemo(
    () =>
      (["left", "center", "right"] as const).map((side) => ({
        side,
        rows: panelRowRange(side, state.leftShift, state.rightShift),
        cols: panelColRange(side),
        locked: side === "center" ? false : side === "left" ? locks.left : locks.right,
      })),
    [locks.left, locks.right, state.leftShift, state.rightShift],
  );

  function cellPx() {
    const el = wrapRef.current;
    if (!el) return 24;
    return el.clientWidth / 14;
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, vehicle: Vehicle) {
    if (!interactive) return;
    onSelect(vehicle.id);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({ id: vehicle.id, cells: 0 });
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>, vehicle: Vehicle) {
    if (!drag || drag.id !== vehicle.id) return;
    const size = cellPx();
    const delta = vehicle.orientation === "h" ? event.movementX : event.movementY;
    const next = drag.cells + delta / size;
    setDrag({ id: vehicle.id, cells: next });
  }

  function onPointerUp(vehicle: Vehicle) {
    if (!drag || drag.id !== vehicle.id) return;
    const dir: 1 | -1 = drag.cells >= 0 ? 1 : -1;
    const want = Math.round(Math.abs(drag.cells));
    if (want > 0) onStep(vehicle.id, dir, want);
    setDrag(null);
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
        <span className="text-amber-300">실버 출구 ←</span>
        <span>6×14 주차 그리드</span>
        <span className="text-amber-300">→ 골드 출구</span>
      </div>
      <div
        ref={wrapRef}
        className="relative mx-auto w-full max-w-full overflow-hidden rounded-[20px] bg-[#0d1118] p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.45)]"
        style={{ aspectRatio: `14 / ${bounds.rows}`, touchAction: "none" }}
      >
        <div className="relative h-full w-full">
          {panels.map((panel) => {
            const left = (panel.cols.start / 14) * 100;
            const width = ((panel.cols.end - panel.cols.start + 1) / 14) * 100;
            const top = ((panel.rows.start - bounds.minRow) / bounds.rows) * 100;
            const height = (6 / bounds.rows) * 100;
            return (
              <div
                key={panel.side}
                className={cn(
                  "absolute rounded-[18px] border",
                  panel.side === "center"
                    ? "border-white/10 bg-[#1a2030]"
                    : "border-white/15 bg-[#232a3a]",
                  panel.locked && "ring-2 ring-rose-400/80",
                )}
                style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              >
                <div
                  className="absolute inset-[6%] grid opacity-40"
                  style={{
                    gridTemplateColumns: `repeat(${panel.cols.end - panel.cols.start + 1}, 1fr)`,
                    gridTemplateRows: "repeat(6, 1fr)",
                  }}
                >
                  {Array.from({
                    length: (panel.cols.end - panel.cols.start + 1) * 6,
                  }).map((_, i) => (
                    <div key={i} className="m-[8%] rounded-sm bg-white/10" />
                  ))}
                </div>
                {panel.side !== "center" &&
                  (shiftInteractive ? (
                    <PanelShiftHits
                      side={panel.side}
                      locked={
                        panel.side === "left"
                          ? shiftInteractive.lockedLeft ||
                            (shiftInteractive.chosen !== null && shiftInteractive.chosen !== "left")
                          : shiftInteractive.lockedRight ||
                            (shiftInteractive.chosen !== null && shiftInteractive.chosen !== "right")
                      }
                      onNudge={shiftInteractive.onNudge}
                    />
                  ) : (
                    <>
                      <Handle className="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" />
                      <Handle className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" />
                    </>
                  ))}
                {panel.locked && (
                  <div className="absolute inset-x-2 top-2 rounded-full bg-rose-500/90 px-2 py-0.5 text-center text-[10px] font-bold text-white">
                    잠김
                  </div>
                )}
              </div>
            );
          })}

          {([4, 8] as const).map((col) => (
            <div
              key={col}
              className="pointer-events-none absolute top-0 w-px bg-cyan-300/50"
              style={{
                left: `${((col + 1) / 14) * 100}%`,
                height: "100%",
                boxShadow: "0 0 12px rgba(103,232,249,0.55)",
              }}
            />
          ))}

          {slideStops.map((stop) => (
            <button
              key={`stop-${stop.steps}`}
              type="button"
              aria-label={`${stop.steps > 0 ? "앞" : "뒤"} ${Math.abs(stop.steps)}칸`}
              onClick={() => selectedId && onPickSlide?.(selectedId, stop.steps)}
              className={cn(
                "absolute z-30 flex items-center justify-center rounded-full border-2",
                slideChosenSteps === stop.steps
                  ? "border-amber-200 bg-amber-300"
                  : "border-amber-300/80 bg-amber-300/35",
              )}
              style={{
                left: `${((stop.tipCol + 0.22) / 14) * 100}%`,
                top: `${((stop.tipRow - bounds.minRow + 0.22) / bounds.rows) * 100}%`,
                width: `${(0.56 / 14) * 100}%`,
                height: `${(0.56 / bounds.rows) * 100}%`,
              }}
            />
          ))}

          {state.vehicles.map((vehicle) => {
            const selected = selectedId === vehicle.id;
            const budget = moveBudget ?? 20;
            const maxFwd =
              interactive && budget > 0 ? Math.min(legalSteps(state, player, vehicle.id, 1), budget) : 0;
            const maxBack =
              interactive && budget > 0 ? Math.min(legalSteps(state, player, vehicle.id, -1), budget) : 0;
            const canTouch = interactive && budget > 0 && (maxFwd > 0 || maxBack > 0 || selected);
            const cells = vehicleCells(vehicle).filter((c) =>
              isOnPanel(c, state.leftShift, state.rightShift) ||
              c.col < 0 ||
              c.col >= 14,
            );
            if (cells.length === 0) return null;
            const rows = cells.map((c) => c.row);
            const cols = cells.map((c) => c.col);
            const r0 = Math.min(...rows);
            const c0 = Math.min(...cols);
            const r1 = Math.max(...rows);
            const c1 = Math.max(...cols);
            return (
              <button
                key={vehicle.id}
                type="button"
                onPointerDown={(e) => canTouch && onPointerDown(e, vehicle)}
                onPointerMove={(e) => onPointerMove(e, vehicle)}
                onPointerUp={() => onPointerUp(vehicle)}
                onClick={() => {
                  if (!interactive) return;
                  onSelect(vehicle.id);
                }}
                className={cn(
                  "absolute z-10 overflow-hidden rounded-[10px] border text-left shadow-lg transition-transform",
                  selected ? "z-20 ring-2 ring-white" : "border-black/40",
                  canTouch ? "cursor-grab active:cursor-grabbing" : "pointer-events-none cursor-default",
                )}
                style={{
                  left: `${(c0 / 14) * 100}%`,
                  top: `${((r0 - bounds.minRow) / bounds.rows) * 100}%`,
                  width: `${((c1 - c0 + 1) / 14) * 100}%`,
                  height: `${((r1 - r0 + 1) / bounds.rows) * 100}%`,
                  background: `linear-gradient(180deg, ${vehicle.color} 0%, color-mix(in srgb, ${vehicle.color} 70%, #000) 100%)`,
                }}
              >
                <span className="absolute inset-x-[12%] top-[18%] h-[28%] rounded-full bg-white/25" />
                {vehicle.kind !== "block" && (
                  <span className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] font-black tracking-wide text-black/70">
                    {vehicle.kind === "gold" ? "GOLD" : "SILVER"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Handle({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "absolute h-4 w-4 rounded-full border-2 border-amber-300/80 bg-[#111] shadow-[0_0_10px_rgba(251,191,36,0.65)]",
        className,
      )}
    />
  );
}

function PanelShiftHits({
  side,
  locked,
  onNudge,
}: {
  side: "left" | "right";
  locked: boolean;
  onNudge: (side: "left" | "right", rows: 1 | -1) => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={locked}
        aria-label={`${side === "left" ? "왼쪽" : "오른쪽"} 판 위로`}
        onClick={(e) => {
          e.stopPropagation();
          onNudge(side, -1);
        }}
        className="absolute inset-x-1 top-0 z-20 flex h-[22%] items-start justify-center pt-1 disabled:opacity-40"
      >
        <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-zinc-950">위</span>
      </button>
      <button
        type="button"
        disabled={locked}
        aria-label={`${side === "left" ? "왼쪽" : "오른쪽"} 판 아래로`}
        onClick={(e) => {
          e.stopPropagation();
          onNudge(side, 1);
        }}
        className="absolute inset-x-1 bottom-0 z-20 flex h-[22%] items-end justify-center pb-1 disabled:opacity-40"
      >
        <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-zinc-950">아래</span>
      </button>
    </>
  );
}
