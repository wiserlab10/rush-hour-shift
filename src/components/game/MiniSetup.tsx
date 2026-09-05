"use client";

import { vehicleCells } from "@/lib/game/board";
import type { SetupDef } from "@/lib/game/types";

export function MiniSetup({ setup }: { setup: SetupDef }) {
  return (
    <div className="relative aspect-[14/6] w-full overflow-hidden rounded-lg bg-[#1b1f27] ring-1 ring-white/10">
      <div className="absolute inset-y-0 left-0 w-[calc(5/14*100%)] bg-white/[0.03]" />
      <div className="absolute inset-y-0 left-[calc(5/14*100%)] w-[calc(4/14*100%)] bg-cyan-400/[0.04]" />
      <div className="absolute inset-y-0 right-0 w-[calc(5/14*100%)] bg-white/[0.03]" />
      {setup.vehicles.map((v) => {
        const cells = vehicleCells(v);
        return cells.map((cell) => (
          <span
            key={`${v.id}-${cell.row}-${cell.col}`}
            className="absolute rounded-[2px]"
            style={{
              left: `${(cell.col / 14) * 100}%`,
              top: `${(cell.row / 6) * 100}%`,
              width: `${100 / 14}%`,
              height: `${100 / 6}%`,
              background: v.color,
              boxShadow: v.kind === "gold" || v.kind === "silver" ? `0 0 6px ${v.color}` : undefined,
            }}
          />
        ));
      })}
    </div>
  );
}
