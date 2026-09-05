import {
  cloneVehicles,
  findVehicle,
  heroFullyOff,
  isExitCell,
  isLocked,
  isOnPanel,
  occupancyMap,
  staysEngaged,
  vehicleCells,
  vehicleOnPanel,
} from "./board";
import { buildDeck, mulberry32, shuffle } from "./deck";
import { getSetup } from "./setups";
import type {
  Card,
  GameState,
  PlayerColor,
  PublicGameState,
  TurnAction,
  Vehicle,
} from "./types";

export function createGame(setupId: string, seed = Date.now()): GameState {
  const setup = getSetup(setupId);
  const rng = mulberry32(seed);
  const deck = shuffle(buildDeck(), rng);
  const goldHand = deck.splice(0, 4);
  const silverHand = deck.splice(0, 4);

  return {
    setupId,
    status: "playing",
    vehicles: setup.vehicles.map((v) => ({ ...v })),
    leftShift: 0,
    rightShift: 0,
    turn: "gold",
    hands: { gold: goldHand, silver: silverHand },
    drawPile: deck,
    discardPile: [],
    winner: null,
    lastCard: null,
    turnCount: 1,
  };
}

export function opponentOf(color: PlayerColor): PlayerColor {
  return color === "gold" ? "silver" : "gold";
}

function assertPlayable(state: GameState, player: PlayerColor, vehicle: Vehicle) {
  if (vehicle.kind !== "block" && vehicle.kind !== player) {
    throw new Error("상대 히어로는 못 움직여");
  }
}

function cellAllowed(
  state: GameState,
  player: PlayerColor,
  vehicle: Vehicle,
  cell: { row: number; col: number },
): boolean {
  if (vehicle.kind === player && isExitCell(cell, player)) return true;
  return isOnPanel(cell, state.leftShift, state.rightShift);
}

export function legalSteps(
  state: GameState,
  player: PlayerColor,
  vehicleId: string,
  dir: 1 | -1,
): number {
  const vehicle = findVehicle(state.vehicles, vehicleId);
  if (!vehicle) return 0;
  try {
    assertPlayable(state, player, vehicle);
  } catch {
    return 0;
  }

  const occ = occupancyMap(state.vehicles, vehicleId);
  let steps = 0;
  let row = vehicle.row;
  let col = vehicle.col;

  while (steps < 20) {
    const next: Vehicle = {
      ...vehicle,
      row: vehicle.orientation === "v" ? row + dir : row,
      col: vehicle.orientation === "h" ? col + dir : col,
    };
    const cells = vehicleCells(next);
    const blocked = cells.some((cell) => {
      if (!cellAllowed(state, player, vehicle, cell)) return true;
      if (cell.col >= 0 && cell.col < 14 && occ.has(`${cell.row},${cell.col}`)) {
        return true;
      }
      return false;
    });
    if (blocked) break;
    steps += 1;
    row = next.row;
    col = next.col;
    if (heroFullyOff(next)) break;
  }
  return steps;
}

export function applyMove(
  state: GameState,
  player: PlayerColor,
  vehicleId: string,
  steps: number,
): GameState {
  if (steps === 0) return state;
  const vehicles = cloneVehicles(state.vehicles);
  const vehicle = findVehicle(vehicles, vehicleId);
  if (!vehicle) throw new Error("없는 차");
  assertPlayable(state, player, vehicle);

  const dir: 1 | -1 = steps > 0 ? 1 : -1;
  const abs = Math.abs(steps);
  const max = legalSteps(state, player, vehicleId, dir);
  if (abs > max) throw new Error("그쪽으로는 못 가");

  if (vehicle.orientation === "h") vehicle.col += steps;
  else vehicle.row += steps;

  const next = { ...state, vehicles };
  if (heroFullyOff(vehicle)) {
    next.winner = player;
    next.status = "finished";
  }
  return next;
}

export function slideActionSteps(action: Extract<TurnAction, { type: "slide" }>): number {
  if (typeof action.steps === "number" && action.steps !== 0) return action.steps;
  return 0;
}

export function applySlide(
  state: GameState,
  player: PlayerColor,
  vehicleId: string,
  steps: number,
): GameState {
  if (steps === 0) return state;
  const dir: 1 | -1 = steps > 0 ? 1 : -1;
  const max = legalSteps(state, player, vehicleId, dir);
  if (max <= 0) throw new Error("막혀서 직진 불가");
  if (Math.abs(steps) > max) throw new Error("그 칸까지는 길이 막혀");
  return applyMove(state, player, vehicleId, steps);
}

/** Legal origin cells this vehicle can stop on along its current line. */
export function legalSlideStops(
  state: GameState,
  player: PlayerColor,
  vehicleId: string,
): { steps: number; row: number; col: number; tipRow: number; tipCol: number }[] {
  const vehicle = findVehicle(state.vehicles, vehicleId);
  if (!vehicle) return [];
  const fwd = legalSteps(state, player, vehicleId, 1);
  const back = legalSteps(state, player, vehicleId, -1);
  const stops: { steps: number; row: number; col: number; tipRow: number; tipCol: number }[] = [];
  for (let s = -back; s <= fwd; s++) {
    if (s === 0) continue;
    const row = vehicle.orientation === "v" ? vehicle.row + s : vehicle.row;
    const col = vehicle.orientation === "h" ? vehicle.col + s : vehicle.col;
    const tipRow = vehicle.orientation === "v" ? (s > 0 ? row + vehicle.length - 1 : row) : row;
    const tipCol = vehicle.orientation === "h" ? (s > 0 ? col + vehicle.length - 1 : col) : col;
    stops.push({ steps: s, row, col, tipRow, tipCol });
  }
  return stops;
}

export function applyShift(
  state: GameState,
  side: "left" | "right",
  rows: number,
): GameState {
  if (rows === 0) throw new Error("적어도 1줄은 밀어야 해");
  if (isLocked(state, side)) throw new Error("이음새에 차가 걸쳐 있어서 잠김");

  const leftShift = side === "left" ? state.leftShift + rows : state.leftShift;
  const rightShift = side === "right" ? state.rightShift + rows : state.rightShift;
  if (!staysEngaged(leftShift, rightShift)) {
    throw new Error("판이 최소 1줄은 맞닿아 있어야 해");
  }

  const vehicles = cloneVehicles(state.vehicles);
  for (const veh of vehicles) {
    if (vehicleOnPanel(veh, side, state.leftShift, state.rightShift)) {
      veh.row += rows;
    }
  }

  return { ...state, vehicles, leftShift, rightShift };
}

/** How many row-steps this end panel can still slide in `dir` (-1 up, +1 down). */
export function legalShiftSteps(
  state: Pick<GameState, "vehicles" | "leftShift" | "rightShift">,
  side: "left" | "right",
  dir: 1 | -1,
): number {
  if (isLocked(state, side)) return 0;
  let steps = 0;
  let left = state.leftShift;
  let right = state.rightShift;
  while (steps < 12) {
    const nextLeft = side === "left" ? left + dir : left;
    const nextRight = side === "right" ? right + dir : right;
    if (!staysEngaged(nextLeft, nextRight)) break;
    steps += 1;
    left = nextLeft;
    right = nextRight;
  }
  return steps;
}

export function spentMovePoints(actions: TurnAction[]): number {
  return actions
    .filter((a): a is Extract<TurnAction, { type: "move" }> => a.type === "move")
    .reduce((sum, a) => sum + Math.abs(a.steps), 0);
}

export function spentShiftPoints(actions: TurnAction[]): number {
  return actions
    .filter((a): a is Extract<TurnAction, { type: "shift" }> => a.type === "shift")
    .reduce((sum, a) => sum + Math.abs(a.rows), 0);
}

export function remainingMovePoints(card: Card, actions: TurnAction[]): number {
  return remainingPoolPoints(card, actions);
}

/** Number cards: car cells only. Combo: shared pool of car cells + panel row-steps. Shift is uncapped. */
export function remainingPoolPoints(card: Card, actions: TurnAction[]): number {
  if (card.kind === "shift") return Number.POSITIVE_INFINITY;
  const cap = card.moves ?? 0;
  const spent = card.kind === "combo" ? spentMovePoints(actions) + spentShiftPoints(actions) : spentMovePoints(actions);
  return Math.max(0, cap - spent);
}

export function shiftBudgetKind(card: Card): "unlimited" | "shared" | "none" {
  if (card.kind === "shift") return "unlimited";
  if (card.kind === "combo") return "shared";
  return "none";
}

function shiftSides(actions: TurnAction[]): Array<"left" | "right"> {
  return [...new Set(actions.filter((a): a is Extract<TurnAction, { type: "shift" }> => a.type === "shift").map((a) => a.side))];
}

export function validateCardActions(card: Card, actions: TurnAction[]): string | null {
  const moves = actions.filter((a): a is Extract<TurnAction, { type: "move" }> => a.type === "move");
  const slides = actions.filter((a) => a.type === "slide");
  const shifts = actions.filter((a) => a.type === "shift");
  const moveTotal = spentMovePoints(actions);
  const shiftTotal = spentShiftPoints(actions);
  const sides = shiftSides(actions);

  if (card.kind === "move") {
    if (slides.length || shifts.length) return "숫자 카드는 이동만 가능해";
    if (moveTotal > (card.moves ?? 0)) return `이동은 ${card.moves}칸까지`;
    return null;
  }
  if (card.kind === "slide") {
    if (moves.length || shifts.length) return "직진 카드는 한 대만 밀어";
    if (slides.length > 1) return "직진은 한 대만";
    const ids = new Set(slides.map((a) => (a as Extract<TurnAction, { type: "slide" }>).vehicleId));
    if (ids.size > 1) return "직진은 한 대만";
    return null;
  }
  if (card.kind === "shift") {
    if (moves.length || slides.length) return "쉬프트 카드는 판만 밀어";
    if (sides.length > 1) return "판은 한 쪽만 밀어";
    return null;
  }
  if (slides.length) return "콤보는 직진이 없어";
  if (sides.length > 1) return "판은 한 쪽만 밀어";
  if (moveTotal + shiftTotal > (card.moves ?? 0)) {
    return `차·판 합쳐 ${card.moves}칸까지`;
  }
  return null;
}

export function applyTurn(
  state: GameState,
  player: PlayerColor,
  cardId: string,
  actions: TurnAction[],
): GameState {
  if (state.status !== "playing") throw new Error("이미 끝난 게임");
  if (state.turn !== player) throw new Error("네 턴이 아니야");

  const hand = state.hands[player];
  const card = hand.find((c) => c.id === cardId);
  if (!card) throw new Error("손에 없는 카드");

  const usage = validateCardActions(card, actions);
  if (usage) throw new Error(usage);

  let next: GameState = {
    ...state,
    vehicles: cloneVehicles(state.vehicles),
    hands: {
      gold: [...state.hands.gold],
      silver: [...state.hands.silver],
    },
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
  };

  for (const action of actions) {
    if (next.winner) break;
    if (action.type === "move") {
      next = applyMove(next, player, action.vehicleId, action.steps);
    } else if (action.type === "slide") {
      next = applySlide(next, player, action.vehicleId, slideActionSteps(action));
    } else {
      next = applyShift(next, action.side, action.rows);
    }
  }

  next.hands[player] = next.hands[player].filter((c) => c.id !== cardId);
  next.discardPile = [...next.discardPile, card];
  next.lastCard = card;

  if (!next.winner) {
    if (next.drawPile.length === 0) {
      next.drawPile = shuffle(next.discardPile, Math.random);
      next.discardPile = [];
    }
    const drawn = next.drawPile.shift();
    if (drawn) next.hands[player] = [...next.hands[player], drawn];
    next.turn = opponentOf(player);
    next.turnCount += 1;
  }

  return next;
}

export function sanitizeState(state: GameState, viewer: PlayerColor | null): PublicGameState {
  const { drawPile: pile, hands, ...rest } = state;
  return {
    ...rest,
    drawCount: pile.length,
    hands: {
      gold: viewer === "silver" ? hands.gold.length : hands.gold,
      silver: viewer === "gold" ? hands.silver.length : hands.silver,
    },
  };
}

export function publicForViewer(state: GameState, viewer: PlayerColor): PublicGameState {
  return sanitizeState(state, viewer);
}
