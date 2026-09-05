"use client";

import { cardHint, cardTitle } from "@/lib/game/deck";
import type { Card } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function CardHand({
  cards,
  selectedId,
  disabled,
  onSelect,
}: {
  cards: Card[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (card: Card) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map((card) => {
        const selected = selectedId === card.id;
        return (
          <button
            key={card.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(card)}
            className={cn(
              "relative min-h-[76px] rounded-2xl border px-1.5 py-2 text-center transition-all",
              selected
                ? "border-amber-300 bg-amber-300 text-zinc-950 shadow-[0_0_24px_rgba(251,191,36,0.45)] -translate-y-1"
                : card.kind === "shift"
                  ? "border-cyan-300/40 bg-[#171d2b] text-white"
                  : "border-white/10 bg-[#171d2b] text-white",
              disabled && "opacity-50",
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
              {card.kind === "move" ? "이동" : card.kind === "slide" ? "직진" : card.kind === "shift" ? "쉬프트" : "콤보"}
            </div>
            <div className="mt-1 text-lg font-black leading-none">{cardTitle(card)}</div>
            <div className={cn("mt-2 text-[10px] leading-tight", selected ? "text-zinc-800" : "text-white/55")}>
              {cardHint(card)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function CardBacks({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-8 w-6 rounded-md border border-white/10 bg-[repeating-linear-gradient(135deg,#1f2937_0_4px,#111827_4px_8px)]"
        />
      ))}
    </div>
  );
}
