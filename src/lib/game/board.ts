import {
  CENTER_COLS,
  COLS,
  LEFT_COLS,
  RIGHT_COLS,
  ROWS,
  type Cell,
  type GameState,
  type PanelSide,
  type Vehicle,
} from "./types";

export function vehicleCells(v: Vehicle): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < v.length; i++) {
    cells.push(
      v.orientation === "h"
        ? { row: v.row, col: v.col + i }
        : { row: v.row + i, col: v.col },
    );
  }
  return cells;
}

export function panelRowRange(
  side: PanelSide,
  leftShift: number,
  rightShift: number,
): { start: number; end: number } {
  if (side === "left") return { start: leftShift, end: leftShift + ROWS - 1 };
  if (side === "right") return { start: rightShift, end: rightShift + ROWS - 1 };
  return { start: 0, end: ROWS - 1 };
}

export function panelColRange(side: PanelSide): { start: number; end: number } {
  if (side === "left") return LEFT_COLS;
  if (side === "right") return RIGHT_COLS;
  return CENTER_COLS;
}

export function panelCovers(
  side: PanelSide,
  cell: Cell,
  leftShift: number,
  rightShift: number,
): boolean {
  const rows = panelRowRange(side, leftShift, rightShift);
  const cols = panelColRange(side);
  return (
    cell.row >= rows.start &&
    cell.row <= rows.end &&
    cell.col >= cols.start &&
    cell.col <= cols.end
  );
}

export function isOnPanel(
  cell: Cell,
  leftShift: number,
  rightShift: number,
): boolean {
  return (
    panelCovers("left", cell, leftShift, rightShift) ||
    panelCovers("center", cell, leftShift, rightShift) ||
    panelCovers("right", cell, leftShift, rightShift)
  );
}

export function panelsForCell(
  cell: Cell,
  leftShift: number,
  rightShift: number,
): PanelSide[] {
  return (["left", "center", "right"] as const).filter((side) =>
    panelCovers(side, cell, leftShift, rightShift),
  );
}

export function isExitCell(cell: Cell, hero: "gold" | "silver"): boolean {
  if (hero === "gold") return cell.col >= COLS;
  return cell.col < 0;
}

export function heroFullyOff(v: Vehicle): boolean {
  if (v.kind !== "gold" && v.kind !== "silver") return false;
  const hero = v.kind;
  return vehicleCells(v).every((cell) => isExitCell(cell, hero));
}

export function occupancyMap(
  vehicles: Vehicle[],
  ignoreId?: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const v of vehicles) {
    if (v.id === ignoreId) continue;
    for (const cell of vehicleCells(v)) {
      if (cell.col < 0 || cell.col >= COLS) continue;
      map.set(`${cell.row},${cell.col}`, v.id);
    }
  }
  return map;
}

export function vehicleOnPanel(
  v: Vehicle,
  side: PanelSide,
  leftShift: number,
  rightShift: number,
): boolean {
  const cells = vehicleCells(v).filter((c) => !isExitCell(c, "gold") && !isExitCell(c, "silver"));
  if (cells.length === 0) return false;
  return cells.every((cell) => panelCovers(side, cell, leftShift, rightShift));
}

export function straddlesSeam(
  v: Vehicle,
  a: "left" | "right",
  leftShift: number,
  rightShift: number,
): boolean {
  const other: PanelSide = "center";
  const cells = vehicleCells(v).filter(
    (c) => c.col >= 0 && c.col < COLS,
  );
  if (cells.length === 0) return false;
  const onA = cells.some((c) => panelCovers(a, c, leftShift, rightShift));
  const onCenter = cells.some((c) => panelCovers(other, c, leftShift, rightShift));
  return onA && onCenter;
}

export function isLocked(
  state: Pick<GameState, "vehicles" | "leftShift" | "rightShift">,
  side: "left" | "right",
): boolean {
  return state.vehicles.some((v) =>
    straddlesSeam(v, side, state.leftShift, state.rightShift),
  );
}

export function lockInfo(state: Pick<GameState, "vehicles" | "leftShift" | "rightShift">) {
  return {
    left: isLocked(state, "left"),
    right: isLocked(state, "right"),
  };
}

export function staysEngaged(
  leftShift: number,
  rightShift: number,
): boolean {
  const left = panelRowRange("left", leftShift, rightShift);
  const right = panelRowRange("right", leftShift, rightShift);
  const center = { start: 0, end: ROWS - 1 };
  const leftOverlap = Math.min(left.end, center.end) - Math.max(left.start, center.start) + 1;
  const rightOverlap = Math.min(right.end, center.end) - Math.max(right.start, center.start) + 1;
  return leftOverlap >= 1 && rightOverlap >= 1;
}

export function worldBounds(leftShift: number, rightShift: number) {
  const minRow = Math.min(leftShift, 0, rightShift);
  const maxRow = Math.max(leftShift + ROWS - 1, ROWS - 1, rightShift + ROWS - 1);
  return { minRow, maxRow, rows: maxRow - minRow + 1 };
}

export function findVehicle(vehicles: Vehicle[], id: string): Vehicle | undefined {
  return vehicles.find((v) => v.id === id);
}

export function cloneVehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.map((v) => ({ ...v }));
}
