"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeScreen() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-6">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300/80">2인용 보드</p>
        <h1 className="mt-1 text-4xl font-black leading-none text-white">러시아워 쉬프트</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          골드와 실버가 같은 주차장에서 반대편으로 먼저 빠져나간다. 카드를 내고, 차를 밀고, 끝 판을 위아래로 비틀어.
        </p>
      </header>

      <nav className="flex flex-col gap-3">
        <Link href="/setup?mode=hotseat" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          한 폰에서
        </Link>
        <Link
          href="/host"
          className={cn(buttonVariants({ variant: "silver", size: "lg" }), "w-full")}
        >
          방 만들기
        </Link>
        <Link
          href="/join"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          코드로 입장
        </Link>
        <Link href="/rules" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-full")}>
          규칙
        </Link>
      </nav>
    </div>
  );
}
