import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RulesPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">이렇게 해</h1>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          뒤로
        </Link>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-white/75">
        <p>보드를 가로로 이어 붙인 세 판(5+4+5). 가운데는 고정, 왼쪽/오른쪽만 위아래로 밀 수 있어.</p>
        <p>턴마다 패 4장 중 1장을 내고, 더미에서 1장을 뽑아.</p>
        <p>
          <b className="text-white">숫자</b> — 그 칸수만큼 차를 밀어. 여러 대에 나눠도 됨. 상대 히어로는 금지.
        </p>
        <p>
          <b className="text-white">직진</b> — 한 대를 같은 줄에서 막히기 전 <b className="text-white">아무 칸</b>에
          세울 수 있어. 끝까지 안 가도 됨. 히어로가 반대편 끝으로 완전히 나가면 승리.
        </p>
        <p>
          <b className="text-white">쉬프트</b> — 왼쪽 또는 오른쪽 끝 판을 여러 줄 위아래로. 1칸 제한 없음. 이음새에 차가
          걸쳐 있으면 잠김. 세 판이 최소 1줄은 맞닿아 있어야 해. 그 턴에는 차를 못 움직여.
        </p>
        <p>
          <b className="text-white">콤보</b> — 숫자 N은{" "}
          <b className="text-white">차 이동과 판 밀기가 나눠 쓰는 공유 포인트</b>. 차 1칸=1, 판 1줄=1. 예: 4면 차 2칸+판
          2줄, 또는 판만 4줄. 순서는 그때그때 고르면 됨. 쉬프트를 꼭 할 필요는 없고, 1줄로 고정되지도 않아.
        </p>
        <p>장애물 차는 보드 밖으로 못 나가. 히어로만 상대 쪽 끝으로 빠져나갈 수 있어.</p>
      </div>
    </div>
  );
}
