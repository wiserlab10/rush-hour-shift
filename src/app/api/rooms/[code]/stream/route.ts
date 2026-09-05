import { getRoom, subscribeRoom, viewFor } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { code } = await ctx.params;
    const playerId = new URL(req.url).searchParams.get("playerId") ?? undefined;
    const room = await getRoom(code);
    if (!room) return json({ error: "방이 없어" }, 404);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (hint?: Awaited<ReturnType<typeof getRoom>>) => {
          void (async () => {
            const current = hint ?? (await getRoom(code));
            if (!current) return;
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(viewFor(current, playerId))}\n\n`),
              );
            } catch {
              /* client gone */
            }
          })();
        };
        send(room);
        const unsub = subscribeRoom(code, send);
        const ping = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(ping);
          }
        }, 15000);
        req.signal.addEventListener("abort", () => {
          unsub();
          clearInterval(ping);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "스트림 실패";
    return json({ error: message }, 500);
  }
}
