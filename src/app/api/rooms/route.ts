import { NextResponse } from "next/server";
import { createRoom, viewFor } from "@/lib/rooms";
import { getSetup } from "@/lib/game/setups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { setupId?: string; name?: string };
    const setupId = body.setupId ?? "1";
    getSetup(setupId);
    const { room, player } = await createRoom(setupId, body.name ?? "골드");
    return json({
      playerId: player.id,
      color: player.color,
      ...viewFor(room, player.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "방 생성 실패";
    return json({ error: message }, 400);
  }
}
