import { applyTurn, createGame, publicForViewer } from "./game/engine";
import type { ChatMessage, PlayerColor, PublicGameState, TurnAction } from "./game/types";
import { sanitizeChat, sanitizeName } from "./names";
import { codeTaken, loadRoom, saveRoom } from "./room-store";
import type { Room, RoomPlayer } from "./room-types";

export type { Room, RoomPlayer };

type GlobalListeners = typeof globalThis & {
  __rhsListeners?: Map<string, Set<(room: Room) => void>>;
};

const g = globalThis as GlobalListeners;
const listeners = g.__rhsListeners ?? new Map<string, Set<(room: Room) => void>>();
g.__rhsListeners = listeners;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function token(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function emit(room: Room) {
  for (const fn of listeners.get(room.code) ?? []) fn(room);
}

export function subscribeRoom(code: string, fn: (room: Room) => void): () => void {
  const set = listeners.get(code) ?? new Set();
  set.add(fn);
  listeners.set(code, set);
  return () => {
    set.delete(fn);
  };
}

export async function createRoom(setupId: string, hostName: string): Promise<{ room: Room; player: RoomPlayer }> {
  const player: RoomPlayer = { id: token(), name: sanitizeName(hostName, "골드"), color: "gold" };
  let code = randomCode();
  for (let i = 0; i < 12; i++) {
    if (!(await codeTaken(code))) break;
    code = randomCode();
  }
  const room: Room = {
    code,
    setupId,
    game: createGame(setupId),
    players: [player],
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveRoom(room);
  emit(room);
  return { room, player };
}

export async function getRoom(code: string): Promise<Room | undefined> {
  return loadRoom(code);
}

export async function joinRoom(
  code: string,
  name: string,
  existingId?: string,
): Promise<{ room: Room; player: RoomPlayer }> {
  const room = await getRoom(code);
  if (!room) throw new Error("방이 없어");

  if (existingId) {
    const found = room.players.find((p) => p.id === existingId);
    if (found) {
      const nextName = sanitizeName(name, found.name);
      if (nextName && nextName !== found.name) {
        found.name = nextName;
        await saveRoom(room);
        emit(room);
      }
      return { room, player: found };
    }
  }

  if (room.players.length >= 2) {
    throw new Error("방이 가득 찼어");
  }
  const taken = new Set(room.players.map((p) => p.color));
  const color: PlayerColor = taken.has("gold") ? "silver" : "gold";
  const player: RoomPlayer = {
    id: token(),
    name: sanitizeName(name, color === "gold" ? "골드" : "실버"),
    color,
  };
  room.players.push(player);
  await saveRoom(room);
  emit(room);
  return { room, player };
}

export async function postChat(code: string, playerId: string, text: string): Promise<Room> {
  const room = await getRoom(code);
  if (!room) throw new Error("방이 없어");
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("플레이어를 못 찾았어");
  const cleaned = sanitizeChat(text);
  if (!cleaned) throw new Error("메시지를 적어");
  room.messages = [
    ...(room.messages ?? []),
    {
      id: token(),
      playerId: player.id,
      name: player.name,
      color: player.color,
      text: cleaned,
      at: Date.now(),
    },
  ].slice(-80);
  await saveRoom(room);
  emit(room);
  return room;
}

export async function playTurn(
  code: string,
  playerId: string,
  cardId: string,
  actions: TurnAction[],
): Promise<Room> {
  const room = await getRoom(code);
  if (!room) throw new Error("방이 없어");
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("플레이어를 못 찾았어");
  room.game = applyTurn(room.game, player.color, cardId, actions);
  await saveRoom(room);
  emit(room);
  return room;
}

export function viewFor(
  room: Room,
  playerId?: string,
): {
  code: string;
  setupId: string;
  players: { name: string; color: PlayerColor; ready: boolean }[];
  you: PlayerColor | null;
  game: PublicGameState;
  messages: ChatMessage[];
} {
  const you = room.players.find((p) => p.id === playerId) ?? null;
  return {
    code: room.code,
    setupId: room.setupId,
    players: [
      {
        name: room.players.find((p) => p.color === "gold")?.name ?? "골드",
        color: "gold",
        ready: room.players.some((p) => p.color === "gold"),
      },
      {
        name: room.players.find((p) => p.color === "silver")?.name ?? "실버",
        color: "silver",
        ready: room.players.some((p) => p.color === "silver"),
      },
    ],
    you: you?.color ?? null,
    messages: room.messages ?? [],
    game: (() => {
      const game = publicForViewer(room.game, you?.color ?? "gold");
      if (!you) {
        game.hands = {
          gold: room.game.hands.gold.length,
          silver: room.game.hands.silver.length,
        };
      }
      return game;
    })(),
  };
}

export function playerCookieName(code: string) {
  return `rhs_${code.toUpperCase()}`;
}
