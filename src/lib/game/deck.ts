import type { Card } from "./types";

/** Official-size 32-card deck: number moves, slide, shift, move+shift. */
export function buildDeck(): Card[] {
  const cards: Card[] = [];
  let n = 1;
  const add = (count: number, card: Omit<Card, "id">) => {
    for (let i = 0; i < count; i++) {
      cards.push({ ...card, id: `c${n++}` });
    }
  };

  add(3, { kind: "move", moves: 1 });
  add(5, { kind: "move", moves: 2 });
  add(5, { kind: "move", moves: 3 });
  add(3, { kind: "move", moves: 4 });
  add(5, { kind: "slide" });
  add(6, { kind: "shift" });
  add(3, { kind: "combo", moves: 2 });
  add(2, { kind: "combo", moves: 3 });

  return cards;
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cardTitle(card: Card): string {
  if (card.kind === "move") return `${card.moves}`;
  if (card.kind === "slide") return "직진";
  if (card.kind === "shift") return "쉬프트";
  return `${card.moves}+쉬프트`;
}

export function cardHint(card: Card): string {
  if (card.kind === "move") return `차 ${card.moves}칸 (나눠 써도 됨)`;
  if (card.kind === "slide") return "한 대 · 막히기 전 아무 칸";
  if (card.kind === "shift") return "끝 판을 여러 줄 (맞춤음 유지)";
  return `차·판 합쳐 ${card.moves}칸`;
}
