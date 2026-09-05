"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SETUPS } from "@/lib/game/setups";
import { MiniSetup } from "@/components/game/MiniSetup";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HostPage() {
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      setName(localStorage.getItem("rhs-name") ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  function remember(next: string) {
    setName(next);
    try {
      localStorage.setItem("rhs-name", next);
    } catch {
      /* ignore */
    }
  }

  const nick = name.trim() || "골드";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">방 만들기</h1>
          <p className="text-xs text-white/55">닉네임을 적고 배치를 고르면 바로 골드 자리로 들어가.</p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          뒤로
        </Link>
      </div>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-white/55">내 이름</span>
        <input
          value={name}
          onChange={(e) => remember(e.target.value.slice(0, 12))}
          placeholder="비우면 골드"
          maxLength={12}
          autoComplete="nickname"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {SETUPS.map((setup) => (
          <a
            key={setup.id}
            href={`/api/rooms/new?setup=${setup.id}&name=${encodeURIComponent(nick)}`}
            className="min-h-[44px] rounded-2xl border border-white/10 bg-[#141a28] p-2 text-left active:scale-[0.99]"
          >
            <MiniSetup setup={setup} />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-white">{setup.name}</span>
              <span className="text-amber-200/80">{setup.difficulty}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-white/50">{setup.blurb}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
