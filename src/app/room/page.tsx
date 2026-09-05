"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { GameScreen, type RoomView } from "@/components/game/GameScreen";
import { Button } from "@/components/ui/button";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
}

const boots = new Map<string, Promise<{ view: RoomView; playerId: string }>>();

async function bootRoom(code: string, name: string, hintedId: string) {
  const stored =
    hintedId ||
    sessionStorage.getItem(`rhs:${code}`) ||
    readCookie(`rhs_${code}`);

  if (stored) {
    try {
      const data = await apiFetch<RoomView>(
        `/api/rooms/${code}?playerId=${encodeURIComponent(stored)}`,
        {},
        1,
      );
      if (data.you) {
        sessionStorage.setItem(`rhs:${code}`, stored);
        if (name.trim()) {
          try {
            const renamed = await apiFetch<RoomView & { playerId?: string }>(`/api/rooms/${code}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "join", name, playerId: stored }),
            });
            return { view: renamed, playerId: stored };
          } catch {
            return { view: data, playerId: stored };
          }
        }
        return { view: data, playerId: stored };
      }
    } catch {
      /* fall through to join */
    }
  }

  const data = await apiFetch<RoomView & { playerId: string }>(`/api/rooms/${code}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "join",
      name: name.trim(),
      playerId: stored || undefined,
    }),
  });
  sessionStorage.setItem(`rhs:${code}`, data.playerId);
  return { view: data, playerId: data.playerId };
}

function bootOnce(code: string, name: string, hintedId: string) {
  const key = `${code}:${hintedId}:${name}`;
  const existing = boots.get(key);
  if (existing) return existing;
  const task = bootRoom(code, name, hintedId).catch((err) => {
    boots.delete(key);
    throw err;
  });
  boots.set(key, task);
  return task;
}

function readCode(pathname: string, search: URLSearchParams) {
  const fromQuery = search.get("code") ?? "";
  const fromPath = pathname.match(/^\/r\/([A-Za-z0-9]+)/)?.[1] ?? "";
  return (fromQuery || fromPath).toUpperCase();
}

function RoomClient() {
  const pathname = usePathname();
  const search = useSearchParams();
  const code = readCode(pathname, search);
  const [view, setView] = useState<RoomView | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [gate, setGate] = useState<"check" | "ask" | "go">("check");

  useEffect(() => {
    if (!code) return;
    const hinted = search.get("p") ?? "";
    const queryName = search.get("n") ?? "";
    let storedName = "";
    try {
      storedName = localStorage.getItem("rhs-name") ?? "";
    } catch {
      /* ignore */
    }
    const existing = hinted || sessionStorage.getItem(`rhs:${code}`) || readCookie(`rhs_${code}`);
    if (existing) {
      setName(queryName || storedName);
      setGate("go");
      return;
    }
    if (queryName.trim()) {
      setName(queryName);
      setGate("go");
      return;
    }
    setName(storedName);
    setGate("ask");
  }, [code, search]);

  useEffect(() => {
    if (!code || gate !== "go") return;
    bootOnce(code, name, search.get("p") ?? "")
      .then((result) => {
        setPlayerId(result.playerId);
        setView(result.view);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "방이 없어");
      });
  }, [code, gate, name, search]);

  function enter() {
    try {
      localStorage.setItem("rhs-name", name.trim());
    } catch {
      /* ignore */
    }
    setGate("go");
  }

  if (!code) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6 text-center">
        <p className="text-lg font-bold text-white">방 코드가 없어</p>
        <a href="/" className="text-sm text-amber-200 underline">
          로비
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6 text-center">
        <p className="text-lg font-bold text-white">{error}</p>
        <p className="text-sm text-white/60">코드 {code} 방을 못 찾았어. 링크를 다시 받아봐.</p>
        <a href="/" className="text-sm text-amber-200 underline">
          로비
        </a>
      </div>
    );
  }

  if (gate === "ask") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6">
        <p className="text-lg font-bold text-white">이 방에서 쓸 이름</p>
        <p className="text-sm text-white/60">비우면 실버로 들어가. 상대에게 이 이름이 보여.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          placeholder="닉네임"
          maxLength={12}
          autoComplete="nickname"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
        />
        <Button size="lg" className="w-full" onClick={enter}>
          {code} 입장
        </Button>
        <a href="/" className="text-center text-sm text-amber-200 underline">
          로비
        </a>
      </div>
    );
  }

  if (!view || !playerId) {
    return <div className="p-6 text-white/60">방 찾는 중… {code}</div>;
  }

  return <GameScreen mode="online" room={view} playerId={playerId} />;
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white/60">방 찾는 중…</div>}>
      <RoomClient />
    </Suspense>
  );
}
