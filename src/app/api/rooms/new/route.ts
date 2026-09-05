import { NextResponse } from "next/server";
import { createRoom, playerCookieName, viewFor } from "@/lib/rooms";
import { getSetup } from "@/lib/game/setups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const setupId = url.searchParams.get("setup") ?? "1";
    const name = url.searchParams.get("name") ?? "골드";
    getSetup(setupId);
    const { room, player } = await createRoom(setupId, name);
    const dest = `/r/${room.code}?p=${encodeURIComponent(player.id)}`;
    const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"/>
<meta http-equiv="refresh" content="0;url=${dest}"/>
<title>방 만드는 중</title>
</head>
<body style="background:#070b14;color:#fff;font-family:sans-serif;padding:24px">
<p>방 만들었어. 바로 들어갈게…</p>
<p><a href="${dest}" style="color:#fbbf24">안 열리면 여기</a></p>
<script>location.replace(${JSON.stringify(dest)});</script>
</body></html>`;
    const res = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
    res.cookies.set(playerCookieName(room.code), player.id, {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "방 생성 실패";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { setupId?: string; name?: string };
    const setupId = body.setupId ?? "1";
    getSetup(setupId);
    const { room, player } = await createRoom(setupId, body.name ?? "골드");
    return NextResponse.json(
      {
        playerId: player.id,
        color: player.color,
        ...viewFor(room, player.id),
      },
      { headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "방 생성 실패";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
