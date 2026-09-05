"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem("rhs-name") ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  async function join() {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4) {
      setError("코드를 입력해");
      return;
    }
    setBusy(true);
    setError("");
    try {
      localStorage.setItem("rhs-name", name.trim());
      await apiFetch(`/api/rooms/${cleaned}`, {}, 1);
      const nick = encodeURIComponent(name.trim());
      window.location.assign(`/r/${cleaned}${nick ? `?n=${nick}` : ""}`);
    } catch {
      setError("방이 없어");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">방 입장</h1>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          뒤로
        </Link>
      </div>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-white/55">내 이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          placeholder="비우면 실버"
          maxLength={12}
          autoComplete="nickname"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
        />
      </label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="코드 예: 7K2MQ"
        autoComplete="off"
        className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-2xl tracking-[0.35em] text-white outline-none"
      />
      <Button size="lg" className="mt-3 w-full" disabled={busy} onClick={join}>
        {busy ? "확인 중…" : "입장"}
      </Button>
      {error && <p className="mt-3 text-center text-sm text-rose-300">{error}</p>}
    </div>
  );
}
