"use client";

import { useEffect, useState } from "react";
import { GameScreen } from "@/components/game/GameScreen";

export default function PlayPage() {
  const [ready, setReady] = useState(false);
  const [setupId, setSetupId] = useState("1");
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setSetupId(q.get("setup") ?? "1");
    setFresh(q.get("new") === "1");
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="p-6 text-white/60">보드 까는 중…</div>;
  }

  return <GameScreen mode="hotseat" setupId={setupId} fresh={fresh} />;
}
