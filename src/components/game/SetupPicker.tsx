"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { SETUPS } from "@/lib/game/setups";
import { MiniSetup } from "./MiniSetup";

export function SetupPicker({
  mode,
  playerName,
}: {
  mode: "hotseat" | "online";
  playerName: string;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function createRoom(setupId: string) {
    setBusyId(setupId);
    setError("");
    try {
      const data = await apiFetch<{ code: string; playerId: string }>("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupId, name: playerName || "골드" }),
        signal: AbortSignal.timeout(8000),
      });
      sessionStorage.setItem(`rhs:${data.code}`, data.playerId);
      window.location.assign(`/r/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "실패");
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {SETUPS.map((setup) =>
          mode === "hotseat" ? (
            <Link
              key={setup.id}
              href={`/play?setup=${setup.id}&new=1`}
              className="rounded-2xl border border-white/10 bg-[#141a28] p-2 text-left active:scale-[0.99]"
            >
              <MiniSetup setup={setup} />
              <SetupCaption setup={setup} busy={false} />
            </Link>
          ) : (
            <button
              key={setup.id}
              type="button"
              disabled={busyId !== null}
              onClick={() => createRoom(setup.id)}
              className="rounded-2xl border border-white/10 bg-[#141a28] p-2 text-left active:scale-[0.99] disabled:opacity-50"
            >
              <MiniSetup setup={setup} />
              <SetupCaption setup={setup} busy={busyId === setup.id} />
            </button>
          ),
        )}
      </div>
      {error && <p className="text-center text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function SetupCaption({
  setup,
  busy,
}: {
  setup: (typeof SETUPS)[number];
  busy: boolean;
}) {
  return (
    <>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-bold text-white">{setup.name}</span>
        <span className="text-amber-200/80">{setup.difficulty}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-white/50">{busy ? "방 만드는 중…" : setup.blurb}</p>
    </>
  );
}
