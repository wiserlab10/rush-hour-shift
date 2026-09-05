import type { SetupDef, Vehicle } from "./types";

let seq = 0;
function v(
  partial: Omit<Vehicle, "id"> & { id?: string },
): Vehicle {
  seq += 1;
  return { id: partial.id ?? `v${seq}`, ...partial };
}

const GOLD = {
  kind: "gold" as const,
  label: "골드",
  color: "#f5c518",
  length: 2 as const,
  orientation: "h" as const,
};

const SILVER = {
  kind: "silver" as const,
  label: "실버",
  color: "#d9e2ec",
  length: 2 as const,
  orientation: "h" as const,
};

const C = {
  red: "#e03131",
  orange: "#f76707",
  green: "#82c91e",
  blue: "#1c7ed6",
  white: "#f8f9fa",
  tan: "#c19a6b",
};

function block(
  label: string,
  color: string,
  length: 2 | 3,
  orientation: "h" | "v",
  row: number,
  col: number,
): Vehicle {
  return v({
    kind: "block",
    label,
    color,
    length,
    orientation,
    row,
    col,
  });
}

/**
 * Official 초기 배치 방법 1–10, encoded cell-by-cell from the printed card.
 * 6×14, panels 5+4+5. Gold left, Silver right. Mix of 2-cell cars and 3-cell trucks.
 */
export const SETUPS: SetupDef[] = [
  {
    id: "1",
    name: "배치 1",
    difficulty: "입문",
    blurb: "가운데 세로 차들만 치우면 길이 열린다",
    vehicles: [
      v({ ...GOLD, row: 1, col: 0, id: "gold" }),
      v({ ...SILVER, row: 4, col: 12, id: "silver" }),
      block("파랑", C.blue, 2, "v", 0, 4),
      block("초록", C.green, 2, "v", 1, 5),
      block("베이지", C.tan, 2, "v", 2, 6),
      block("하양", C.white, 2, "v", 2, 7),
      block("주황 트럭", C.orange, 3, "v", 0, 10),
      block("빨강 트럭", C.red, 3, "h", 1, 11),
      block("주황 가로", C.orange, 3, "h", 4, 0),
      block("빨강 세로", C.red, 3, "v", 3, 3),
      block("남색", C.blue, 2, "v", 3, 8),
      block("연두", C.green, 2, "v", 4, 9),
    ],
  },
  {
    id: "2",
    name: "배치 2",
    difficulty: "입문",
    blurb: "중앙 위아래가 가로 차로 막혀 있다",
    vehicles: [
      v({ ...GOLD, row: 2, col: 0, id: "gold" }),
      v({ ...SILVER, row: 3, col: 12, id: "silver" }),
      block("초록", C.green, 2, "v", 0, 3),
      block("주황 트럭", C.orange, 3, "v", 1, 2),
      block("파랑", C.blue, 2, "h", 0, 6),
      block("하양", C.white, 2, "v", 2, 5),
      block("베이지", C.tan, 2, "v", 2, 8),
      block("빨강 트럭", C.red, 3, "v", 2, 11),
      block("남색", C.blue, 2, "v", 4, 10),
      block("연두", C.green, 2, "h", 5, 6),
    ],
  },
  {
    id: "3",
    name: "배치 3",
    difficulty: "입문",
    blurb: "트럭이 중앙을 세로로 지키고 있다",
    vehicles: [
      v({ ...GOLD, row: 2, col: 0, id: "gold" }),
      v({ ...SILVER, row: 3, col: 12, id: "silver" }),
      block("초록", C.green, 2, "h", 0, 6),
      block("주황 트럭", C.orange, 3, "v", 1, 3),
      block("파랑", C.blue, 2, "v", 2, 2),
      block("하양", C.white, 2, "h", 4, 2),
      block("빨강 트럭", C.red, 3, "v", 2, 6),
      block("주황 세로", C.orange, 3, "v", 1, 7),
      block("흰 가로", C.white, 2, "h", 1, 10),
      block("빨강 오른쪽", C.red, 3, "v", 2, 10),
      block("남색", C.blue, 2, "v", 2, 11),
      block("베이지", C.tan, 2, "h", 5, 6),
    ],
  },
  {
    id: "4",
    name: "배치 4",
    difficulty: "보통",
    blurb: "이음새 옆에 세로 차들이 붙어 있다",
    vehicles: [
      v({ ...GOLD, row: 1, col: 0, id: "gold" }),
      v({ ...SILVER, row: 4, col: 12, id: "silver" }),
      block("파랑", C.blue, 2, "v", 0, 4),
      block("빨강 트럭", C.red, 3, "v", 1, 3),
      block("베이지", C.tan, 2, "v", 0, 9),
      block("카키", C.tan, 2, "v", 2, 5),
      block("하양", C.white, 2, "v", 2, 8),
      block("주황 트럭", C.orange, 3, "v", 2, 10),
      block("흰 아래", C.white, 2, "v", 4, 4),
      block("초록", C.green, 2, "v", 4, 9),
    ],
  },
  {
    id: "5",
    name: "배치 5",
    difficulty: "보통",
    blurb: "가운데 차선이 가로 차 두 대로 막힌다",
    vehicles: [
      v({ ...GOLD, row: 2, col: 0, id: "gold" }),
      v({ ...SILVER, row: 3, col: 12, id: "silver" }),
      block("파랑", C.blue, 2, "v", 0, 4),
      block("주황 트럭", C.orange, 3, "v", 1, 3),
      block("하양", C.white, 2, "v", 0, 9),
      block("베이지", C.tan, 2, "h", 2, 6),
      block("흰 가로", C.white, 2, "h", 3, 6),
      block("빨강 트럭", C.red, 3, "v", 2, 10),
      block("카키", C.tan, 2, "v", 4, 4),
      block("초록", C.green, 2, "v", 4, 9),
    ],
  },
  {
    id: "6",
    name: "배치 6",
    difficulty: "보통",
    blurb: "중앙에 트럭 벽이 서 있다",
    vehicles: [
      v({ ...GOLD, row: 2, col: 0, id: "gold" }),
      v({ ...SILVER, row: 3, col: 12, id: "silver" }),
      block("초록", C.green, 2, "h", 1, 5),
      block("파랑", C.blue, 2, "v", 2, 4),
      block("주황 트럭", C.orange, 3, "v", 2, 5),
      block("주황 오른쪽", C.orange, 3, "v", 1, 7),
      block("빨강 트럭", C.red, 3, "v", 2, 6),
      block("빨강 이음새", C.red, 3, "v", 1, 8),
      block("하양", C.white, 2, "v", 2, 9),
      block("베이지", C.tan, 2, "h", 4, 7),
    ],
  },
  {
    id: "7",
    name: "배치 7",
    difficulty: "어려움",
    blurb: "위아래 가로 트럭을 먼저 풀어라",
    vehicles: [
      v({ ...GOLD, row: 1, col: 0, id: "gold" }),
      v({ ...SILVER, row: 4, col: 12, id: "silver" }),
      block("주황 트럭", C.orange, 3, "v", 0, 2),
      block("주황 가로", C.orange, 3, "h", 0, 9),
      block("초록", C.green, 2, "h", 1, 5),
      block("하양", C.white, 2, "v", 2, 5),
      block("베이지", C.tan, 2, "v", 2, 8),
      block("파랑", C.blue, 2, "h", 4, 7),
      block("빨강 가로", C.red, 3, "h", 5, 2),
      block("빨강 트럭", C.red, 3, "v", 3, 11),
    ],
  },
  {
    id: "8",
    name: "배치 8",
    difficulty: "어려움",
    blurb: "양쪽 끝 트럭이 출구를 지키고 있다",
    vehicles: [
      v({ ...GOLD, row: 1, col: 0, id: "gold" }),
      v({ ...SILVER, row: 4, col: 12, id: "silver" }),
      block("빨강 트럭", C.red, 3, "v", 0, 2),
      block("베이지", C.tan, 2, "v", 0, 4),
      block("초록", C.green, 2, "v", 0, 5),
      block("빨강 오른쪽", C.red, 3, "v", 0, 12),
      block("주황 트럭", C.orange, 3, "v", 3, 1),
      block("주황 오른쪽", C.orange, 3, "v", 3, 11),
      block("파랑", C.blue, 2, "v", 4, 8),
      block("하양", C.white, 2, "v", 4, 9),
    ],
  },
  {
    id: "9",
    name: "배치 9",
    difficulty: "어려움",
    blurb: "골드 차선에 세로 차 벽이 있다",
    vehicles: [
      v({ ...GOLD, row: 2, col: 0, id: "gold" }),
      v({ ...SILVER, row: 3, col: 12, id: "silver" }),
      block("초록", C.green, 2, "v", 2, 2),
      block("하양", C.white, 2, "v", 2, 3),
      block("파랑", C.blue, 2, "v", 2, 4),
      block("주황 트럭", C.orange, 3, "v", 2, 5),
      block("빨강 가로", C.red, 3, "h", 4, 2),
      block("빨강 트럭", C.red, 3, "v", 1, 8),
      block("주황 가로", C.orange, 3, "h", 1, 9),
      block("베이지", C.tan, 2, "v", 2, 9),
      block("남색", C.blue, 2, "v", 2, 10),
      block("연두", C.green, 2, "v", 2, 11),
    ],
  },
  {
    id: "10",
    name: "배치 10",
    difficulty: "어려움",
    blurb: "양쪽 끝 판을 트럭과 차가 막고 있다",
    vehicles: [
      v({ ...GOLD, row: 2, col: 0, id: "gold" }),
      v({ ...SILVER, row: 3, col: 12, id: "silver" }),
      block("초록", C.green, 2, "v", 0, 0),
      block("주황 트럭", C.orange, 3, "v", 1, 2),
      block("빨강 트럭", C.red, 3, "v", 0, 5),
      block("파랑", C.blue, 2, "v", 0, 13),
      block("남색", C.blue, 2, "v", 2, 6),
      block("하양", C.white, 2, "v", 2, 7),
      block("빨강 오른쪽", C.red, 3, "v", 2, 11),
      block("주황 세로", C.orange, 3, "v", 3, 8),
      block("흰 아래", C.white, 2, "v", 4, 0),
      block("베이지", C.tan, 2, "v", 4, 13),
    ],
  },
];

export function getSetup(id: string): SetupDef {
  const found = SETUPS.find((s) => s.id === id);
  if (!found) throw new Error(`없는 배치: ${id}`);
  return found;
}

export function assertNoOverlap(vehicles: Vehicle[]) {
  const seen = new Map<string, string>();
  for (const veh of vehicles) {
    const cells =
      veh.orientation === "h"
        ? Array.from({ length: veh.length }, (_, i) => ({ r: veh.row, c: veh.col + i }))
        : Array.from({ length: veh.length }, (_, i) => ({ r: veh.row + i, c: veh.col }));
    for (const cell of cells) {
      if (cell.r < 0 || cell.r > 5 || cell.c < 0 || cell.c > 13) {
        throw new Error(`${veh.label}가 보드 밖 (${cell.r},${cell.c})`);
      }
      const key = `${cell.r},${cell.c}`;
      if (seen.has(key)) {
        throw new Error(`${veh.label}가 ${seen.get(key)}와 겹침 ${key}`);
      }
      seen.set(key, veh.label);
    }
  }
}

for (const setup of SETUPS) {
  assertNoOverlap(setup.vehicles);
}
