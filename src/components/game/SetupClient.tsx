"use client";

import Link from "next/link";
import { useState } from "react";
import { SetupPicker } from "./SetupPicker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SetupClient({ mode }: { mode: "hotseat" | "online" }) {
  const [name, setName] = useState("");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">초기 배치</h1>
          <p className="text-xs text-white/55">
            {mode === "hotseat" ? "한 폰에서 번갈아" : "방을 만들고 친구를 불러"}
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          뒤로
        </Link>
      </div>
      {mode === "online" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="내 이름 (골드)"
          className="mb-4 h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none placeholder:text-white/35"
        />
      )}
      <SetupPicker mode={mode} playerName={name} />
    </div>
  );
}
