export const ROWS = 6;
export const COLS = 14;

export const LEFT_COLS = { start: 0, end: 4 } as const;
export const CENTER_COLS = { start: 5, end: 8 } as const;
export const RIGHT_COLS = { start: 9, end: 13 } as const;

export type PlayerColor = "gold" | "silver";
export type Orientation = "h" | "v";
export type PanelSide = "left" | "center" | "right";
export type CardKind = "move" | "shift" | "slide" | "combo";

export type Vehicle = {
  id: string;
  kind: "gold" | "silver" | "block";
  label: string;
  color: string;
  length: 2 | 3;
  orientation: Orientation;
  row: number;
  col: number;
};

export type Card = {
  id: string;
  kind: CardKind;
  moves?: 1 | 2 | 3 | 4;
};

export type Cell = { row: number; col: number };

export type MoveAction = {
  type: "move";
  vehicleId: string;
  steps: number;
};

export type SlideAction = {
  type: "slide";
  vehicleId: string;
  steps: number;
};

export type ShiftAction = {
  type: "shift";
  side: "left" | "right";
  rows: number;
};

export type TurnAction = MoveAction | SlideAction | ShiftAction;

export type GameStatus = "waiting" | "playing" | "finished";

export type GameState = {
  setupId: string;
  status: GameStatus;
  vehicles: Vehicle[];
  leftShift: number;
  rightShift: number;
  turn: PlayerColor;
  hands: Record<PlayerColor, Card[]>;
  drawPile: Card[];
  discardPile: Card[];
  winner: PlayerColor | null;
  lastCard: Card | null;
  turnCount: number;
};

export type PublicGameState = Omit<GameState, "hands" | "drawPile"> & {
  hands: Record<PlayerColor, Card[] | number>;
  drawCount: number;
};

export type ChatMessage = {
  id: string;
  playerId: string;
  name: string;
  color: PlayerColor;
  text: string;
  at: number;
};

export type SetupDef = {
  id: string;
  name: string;
  difficulty: "입문" | "보통" | "어려움";
  blurb: string;
  vehicles: Vehicle[];
};
