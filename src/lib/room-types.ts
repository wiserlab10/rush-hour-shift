import type { ChatMessage, GameState, PlayerColor } from "./game/types";

export type RoomPlayer = {
  id: string;
  name: string;
  color: PlayerColor;
};

export type Room = {
  code: string;
  setupId: string;
  game: GameState;
  players: RoomPlayer[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};
