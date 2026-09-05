import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Room } from "./room-types";

type GlobalRooms = typeof globalThis & {
  __rhsRooms?: Map<string, Room>;
};

const g = globalThis as GlobalRooms;
const memory = g.__rhsRooms ?? new Map<string, Room>();
g.__rhsRooms = memory;

const DISK = join(tmpdir(), "rush-hour-shift-rooms.json");

function cloudUrl() {
  return (
    process.env.SUPABASE_URL?.replace(/\/$/, "") ||
    "https://zubhbpekaggxelguzfup.supabase.co"
  );
}

function cloudKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1YmhicGVrYWdneGVsZ3V6ZnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1ODE1NjcsImV4cCI6MjEwNDE1NzU2N30.h5M3NjMNDlhpixLh1IqqoRzUiXg1w73JN_RSEt1coN8"
  );
}

export function usesCloudStore() {
  return Boolean(cloudUrl() && cloudKey());
}

function headers() {
  const key = cloudKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function loadDisk() {
  try {
    if (memory.size > 0 || !existsSync(DISK)) return;
    const raw = JSON.parse(readFileSync(DISK, "utf8")) as Room[];
    for (const room of raw) {
      if (room?.code) memory.set(room.code, { ...room, messages: room.messages ?? [] });
    }
  } catch {
    /* ignore */
  }
}

function saveDisk() {
  try {
    mkdirSync(tmpdir(), { recursive: true });
    writeFileSync(DISK, JSON.stringify([...memory.values()]));
  } catch {
    /* ignore */
  }
}

export async function loadRoom(code: string): Promise<Room | undefined> {
  const id = code.toUpperCase();
  if (usesCloudStore()) {
    const res = await fetch(`${cloudUrl()}/rest/v1/rhs_rooms?code=eq.${encodeURIComponent(id)}&select=payload`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("방 저장소를 못 읽었어");
    const rows = (await res.json()) as Array<{ payload: Room }>;
    const room = rows[0]?.payload;
    return room ? { ...room, messages: room.messages ?? [] } : undefined;
  }
  if (memory.size === 0) loadDisk();
  return memory.get(id);
}

export async function saveRoom(room: Room): Promise<void> {
  room.updatedAt = Date.now();
  if (usesCloudStore()) {
    const res = await fetch(`${cloudUrl()}/rest/v1/rhs_rooms`, {
      method: "POST",
      headers: {
        ...headers(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        code: room.code,
        payload: room,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "방 저장 실패");
    }
    return;
  }
  memory.set(room.code, room);
  saveDisk();
}

export async function codeTaken(code: string): Promise<boolean> {
  return Boolean(await loadRoom(code));
}
