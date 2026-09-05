import { NextResponse } from "next/server";
import { getRoom, joinRoom, playTurn, postChat, playerCookieName, viewFor } from "@/lib/rooms";
import type { TurnAction } from "@/lib/game/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

function fail(error: unknown, fallback = "실패") {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("없어") || message.includes("못 찾") ? 404 : 400;
  return json({ error: message }, status);
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { code } = await ctx.params;
    const playerId = new URL(req.url).searchParams.get("playerId") ?? undefined;
    const room = await getRoom(code);
    if (!room) return json({ error: "방이 없어" }, 404);
    return json(viewFor(room, playerId));
  } catch (error) {
    return fail(error, "방 조회 실패");
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { code } = await ctx.params;
    let body: {
      action?: "join" | "play" | "chat";
      name?: string;
      playerId?: string;
      cardId?: string;
      text?: string;
      actions?: TurnAction[];
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return json({ error: "잘못된 요청" }, 400);
    }

    if (body.action === "join") {
      const { room, player } = await joinRoom(code, body.name ?? "", body.playerId);
      const res = json({
        playerId: player.id,
        color: player.color,
        ...viewFor(room, player.id),
      });
      res.cookies.set(playerCookieName(room.code), player.id, {
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      });
      return res;
    }

    if (body.action === "chat") {
      if (!body.playerId) return json({ error: "누가 보냈는지 몰라" }, 400);
      const room = await postChat(code, body.playerId, body.text ?? "");
      return json(viewFor(room, body.playerId));
    }

    if (body.action === "play") {
      if (!body.playerId || !body.cardId) {
        return json({ error: "카드가 필요해" }, 400);
      }
      const room = await playTurn(code, body.playerId, body.cardId, body.actions ?? []);
      return json(viewFor(room, body.playerId));
    }

    return json({ error: "알 수 없는 요청" }, 400);
  } catch (error) {
    return fail(error);
  }
}
