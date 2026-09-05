"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Link2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { isLocked, lockInfo, vehicleOnPanel } from "@/lib/game/board";
import {
  applyTurn,
  createGame,
  legalShiftSteps,
  legalSlideStops,
  legalSteps,
  remainingPoolPoints,
  spentShiftPoints,
} from "@/lib/game/engine";
import { getSetup } from "@/lib/game/setups";
import type { Card, ChatMessage, GameState, PlayerColor, PublicGameState, TurnAction } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { CardBacks, CardHand } from "./CardHand";
import { RoomChat } from "./RoomChat";
import { TrafficBoard } from "./TrafficBoard";

export type RoomView = {
  code: string;
  setupId: string;
  players: { name: string; color: PlayerColor; ready: boolean }[];
  you: PlayerColor | null;
  game: PublicGameState;
  messages?: ChatMessage[];
};

function hydrate(pub: PublicGameState, you: PlayerColor): GameState {
  const mine = pub.hands[you];
  const myHand = Array.isArray(mine) ? mine : [];
  return {
    ...pub,
    drawPile: [],
    hands: {
      gold: you === "gold" ? myHand : [],
      silver: you === "silver" ? myHand : [],
    },
  };
}

function applyDraft(state: GameState, actions: TurnAction[], you: PlayerColor): GameState {
  return actions.reduce((acc, action) => {
    try {
      if (action.type === "move") {
        return {
          ...acc,
          vehicles: acc.vehicles.map((x) =>
            x.id !== action.vehicleId
              ? x
              : {
                  ...x,
                  col: x.orientation === "h" ? x.col + action.steps : x.col,
                  row: x.orientation === "v" ? x.row + action.steps : x.row,
                },
          ),
        };
      }
      if (action.type === "shift") {
        return {
          ...acc,
          leftShift: action.side === "left" ? acc.leftShift + action.rows : acc.leftShift,
          rightShift: action.side === "right" ? acc.rightShift + action.rows : acc.rightShift,
          vehicles: acc.vehicles.map((v) =>
            vehicleOnPanel(v, action.side, acc.leftShift, acc.rightShift)
              ? { ...v, row: v.row + action.rows }
              : v,
          ),
        };
      }
      const steps = action.steps;
      return {
        ...acc,
        vehicles: acc.vehicles.map((x) =>
          x.id !== action.vehicleId
            ? x
            : {
                ...x,
                col: x.orientation === "h" ? x.col + steps : x.col,
                row: x.orientation === "v" ? x.row + steps : x.row,
              },
        ),
      };
    } catch {
      return acc;
    }
  }, state);
}

type Phase = "pick" | "move" | "slide" | "shift" | "combo";
type ComboMode = "move" | "shift";

function shiftSideUsed(actions: TurnAction[]): "left" | "right" | null {
  const hit = actions.find((a): a is Extract<TurnAction, { type: "shift" }> => a.type === "shift");
  return hit?.side ?? null;
}

function buzz() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}

function beep(muted: boolean) {
  if (muted || typeof window === "undefined") return;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 520;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.06);
}

export function GameScreen({
  mode,
  setupId,
  room,
  playerId,
  fresh,
}: {
  mode: "hotseat" | "online";
  setupId?: string;
  room?: RoomView;
  playerId?: string;
  fresh?: boolean;
}) {
  const [local, setLocal] = useState<GameState | null>(null);
  const [hotseatColor, setHotseatColor] = useState<PlayerColor>("gold");
  const [passPhone, setPassPhone] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const [actions, setActions] = useState<TurnAction[]>([]);
  const [phase, setPhase] = useState<Phase>("pick");
  const [comboMode, setComboMode] = useState<ComboMode>("move");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<RoomView | null>(room ?? null);

  useEffect(() => {
    if (mode !== "hotseat") return;
    const id = setupId ?? "1";
    if (fresh) sessionStorage.removeItem(`rhs-hotseat:${id}`);
    try {
      const raw = sessionStorage.getItem(`rhs-hotseat:${id}`);
      if (raw) {
        setLocal(JSON.parse(raw) as GameState);
        return;
      }
    } catch {
      /* ignore */
    }
    setLocal(createGame(id));
    if (fresh) {
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url);
    }
  }, [fresh, mode, setupId]);

  useEffect(() => {
    if (mode === "hotseat" && local) {
      sessionStorage.setItem(`rhs-hotseat:${local.setupId}`, JSON.stringify(local));
    }
  }, [local, mode]);

  const roomCode = room?.code;
  useEffect(() => {
    if (mode !== "online" || !roomCode || !playerId) return;
    const stream = new EventSource(`/api/rooms/${roomCode}/stream?playerId=${playerId}`);
    stream.onmessage = (ev) => {
      try {
        setLive(JSON.parse(ev.data) as RoomView);
      } catch {
        /* ignore */
      }
    };
    const poll = setInterval(async () => {
      try {
        const data = await apiFetch<RoomView>(
          `/api/rooms/${roomCode}?playerId=${playerId}`,
          { signal: AbortSignal.timeout(8000) },
          0,
        );
        setLive(data);
      } catch {
        /* ignore transient poll errors */
      }
    }, 1000);
    return () => {
      stream.close();
      clearInterval(poll);
    };
  }, [mode, playerId, roomCode]);

  const you: PlayerColor = mode === "hotseat" ? hotseatColor : (live?.you ?? "gold");
  const state: GameState | null = mode === "hotseat" ? local : live ? hydrate(live.game, you) : null;
  const setup = getSetup(state?.setupId ?? setupId ?? live?.setupId ?? "1");
  const bothReady = mode === "hotseat" || (live?.players.filter((p) => p.ready).length ?? 0) >= 2;
  const myTurn = !!state && state.status === "playing" && state.turn === you && bothReady;
  const myHand = state ? (Array.isArray(state.hands[you]) ? state.hands[you] : []) : [];
  const opp = you === "gold" ? "silver" : "gold";
  const oppHandCount =
    mode === "hotseat"
      ? (local?.hands[opp].length ?? 4)
      : typeof live?.game.hands[opp] === "number"
        ? (live.game.hands[opp] as number)
        : 4;
  const poolLeft = card ? remainingPoolPoints(card, actions) : 0;
  const slideAction = actions.find((a): a is Extract<TurnAction, { type: "slide" }> => a.type === "slide");
  const shifting = phase === "shift" || (phase === "combo" && comboMode === "shift");
  const movingCars = phase === "move" || (phase === "combo" && comboMode === "move");
  const carsLive = myTurn && (movingCars || phase === "slide");
  const slideStops =
    phase === "slide" && state && selectedId
      ? legalSlideStops(state, you, selectedId).filter((stop) => !slideAction || slideAction.vehicleId === selectedId)
      : [];
  const chosenShiftSide = shiftSideUsed(actions);

  const preview = useMemo(
    () => (state ? applyDraft(state, actions, you) : null),
    [actions, state, you],
  );
  const locks = preview ? lockInfo(preview) : { left: false, right: false };

  const selected = useMemo(
    () => preview?.vehicles.find((v) => v.id === selectedId) ?? null,
    [preview, selectedId],
  );

  const actionsRef = useRef<TurnAction[]>([]);
  actionsRef.current = actions;

  function resetDraft() {
    setCard(null);
    setActions([]);
    actionsRef.current = [];
    setPhase("pick");
    setComboMode("move");
    setSelectedId(null);
    setError("");
  }

  function playFeel() {
    buzz();
    beep(muted);
  }

  function pickCard(next: Card) {
    setCard(next);
    setActions([]);
    actionsRef.current = [];
    setSelectedId(null);
    setError("");
    setComboMode("move");
    if (next.kind === "combo") setPhase("combo");
    else if (next.kind === "move") setPhase("move");
    else if (next.kind === "slide") setPhase("slide");
    else setPhase("shift");
  }

  function nudge(vehicleId: string, dir: 1 | -1, steps = 1) {
    if (!state || !card || !myTurn) return;
    if (phase !== "move" && phase !== "slide" && !(phase === "combo" && comboMode === "move")) return;
    try {
      const prev = actionsRef.current;
      const board = applyDraft(state, prev, you);
      if (phase === "slide") {
        const existing = prev.find((a): a is Extract<TurnAction, { type: "slide" }> => a.type === "slide");
        if (existing && existing.vehicleId !== vehicleId) throw new Error("직진은 한 대만");
        const current = existing?.vehicleId === vehicleId ? existing.steps : 0;
        const nextSteps = current + dir * steps;
        if (nextSteps === 0) {
          actionsRef.current = [];
          setActions([]);
          setError("");
          playFeel();
          return;
        }
        const max = legalSteps(state, you, vehicleId, nextSteps > 0 ? 1 : -1);
        if (max <= 0 || Math.abs(nextSteps) > max) throw new Error("그 칸까지는 길이 막혀");
        const next: TurnAction[] = [{ type: "slide", vehicleId, steps: nextSteps }];
        actionsRef.current = next;
        setActions(next);
        setSelectedId(vehicleId);
        setError("");
        playFeel();
        return;
      }
      const left = remainingPoolPoints(card, prev);
      if (left <= 0) throw new Error("포인트를 다 썼어");
      const max = Math.min(steps, left, legalSteps(board, you, vehicleId, dir));
      if (max <= 0) throw new Error("그쪽으로는 못 가");
      const last = prev[prev.length - 1];
      let next: TurnAction[];
      if (last?.type === "move" && last.vehicleId === vehicleId && Math.sign(last.steps) === dir) {
        const merged = last.steps + dir * max;
        const leftover = remainingPoolPoints(card, prev.slice(0, -1));
        if (Math.abs(merged) > leftover) throw new Error("포인트를 다 썼어");
        next = [...prev.slice(0, -1), { ...last, steps: merged }];
      } else {
        next = [...prev, { type: "move", vehicleId, steps: dir * max }];
      }
      if (remainingPoolPoints(card, next) < 0) throw new Error("포인트를 다 썼어");
      actionsRef.current = next;
      setActions(next);
      setError("");
      playFeel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "이동 실패");
    }
  }

  function placeSlide(vehicleId: string, nextSteps: number) {
    if (!state || !card || !myTurn || phase !== "slide") return;
    try {
      const existing = actionsRef.current.find((a): a is Extract<TurnAction, { type: "slide" }> => a.type === "slide");
      if (existing && existing.vehicleId !== vehicleId) throw new Error("직진은 한 대만");
      if (nextSteps === 0) {
        actionsRef.current = [];
        setActions([]);
        setSelectedId(vehicleId);
        setError("");
        return;
      }
      const max = legalSteps(state, you, vehicleId, nextSteps > 0 ? 1 : -1);
      if (max <= 0 || Math.abs(nextSteps) > max) throw new Error("그 칸까지는 길이 막혀");
      const next: TurnAction[] = [{ type: "slide", vehicleId, steps: nextSteps }];
      actionsRef.current = next;
      setActions(next);
      setSelectedId(vehicleId);
      setError("");
      playFeel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "직진 실패");
    }
  }

  function shift(side: "left" | "right", rows: number) {
    if (!state || !card || !myTurn) return;
    if (phase !== "shift" && !(phase === "combo" && comboMode === "shift")) return;
    const dir: 1 | -1 = rows > 0 ? 1 : -1;
    const step = dir;
    try {
      const prev = actionsRef.current;
      const lockedSide = shiftSideUsed(prev);
      if (lockedSide && lockedSide !== side) throw new Error("이번엔 한 쪽 판만");
      if (card.kind === "combo" && remainingPoolPoints(card, prev) <= 0) {
        throw new Error("포인트를 다 썼어");
      }
      const board = applyDraft(state, prev, you);
      if (isLocked(board, side)) throw new Error("이음새에 차가 걸쳐 있어서 잠김");
      if (legalShiftSteps(board, side, dir) < 1) throw new Error("그쪽으로는 판이 떨어져");
      const last = prev[prev.length - 1];
      let next: TurnAction[];
      if (last?.type === "shift" && last.side === side && Math.sign(last.rows) === dir) {
        next = [...prev.slice(0, -1), { ...last, rows: last.rows + step }];
      } else {
        next = [...prev, { type: "shift", side, rows: step }];
      }
      if (card.kind === "combo" && remainingPoolPoints(card, next) < 0) {
        throw new Error("포인트를 다 썼어");
      }
      actionsRef.current = next;
      setActions(next);
      setError("");
      playFeel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "쉬프트 실패");
    }
  }

  async function confirm() {
    if (!card || !state) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "hotseat" && local) {
        const next = applyTurn(local, you, card.id, actionsRef.current);
        setLocal(next);
        resetDraft();
        if (!next.winner) {
          setHotseatColor(next.turn);
          setPassPhone(true);
        }
      } else if (live && playerId) {
        const data = await apiFetch<RoomView>(`/api/rooms/${live.code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "play", playerId, cardId: card.id, actions: actionsRef.current }),
        });
        setLive(data);
        resetDraft();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "턴 실패");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl =
    typeof window !== "undefined" && live
      ? `${window.location.origin}/r/${live.code}`
      : live
        ? `/r/${live.code}`
        : "";

  async function copyLink() {
    if (!live || !shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "러시아워 쉬프트", url: shareUrl });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt("링크를 복사해", shareUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!state || !preview) {
    return <div className="p-6 text-white/70">방 불러오는 중…</div>;
  }

  const winner = state.winner;
  const waitingFriend = mode === "online" && !bothReady;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-2 overflow-x-hidden px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80">Rush Hour Shift</p>
          <h1 className="text-xl font-black text-white">러시아워 쉬프트</h1>
          <p className="text-xs text-white/55">
            {setup.name} · {setup.difficulty} · {mode === "hotseat" ? "한 폰" : `방 ${live?.code}`}
            {" · "}
            <a href="/" className="text-amber-200/90 underline">
              로비
            </a>
          </p>
        </div>
        <div className="flex gap-1">
          {mode === "online" && live && playerId && (
            <RoomChat
              messages={live.messages ?? []}
              you={you}
              onSend={async (text) => {
                try {
                  const data = await apiFetch<RoomView>(`/api/rooms/${live.code}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "chat", playerId, text }),
                  });
                  setLive(data);
                  setError("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "톡 실패");
                  throw err;
                }
              }}
            />
          )}
          {mode === "online" && (
            <Button variant="outline" size="icon" onClick={copyLink} aria-label="링크 복사">
              {copied ? <Copy className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} aria-label="소리">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <PlayerChip
          color="gold"
          name={mode === "hotseat" ? "골드" : (live?.players.find((p) => p.color === "gold")?.name ?? "골드")}
          active={state.turn === "gold"}
          you={you === "gold"}
        />
        <PlayerChip
          color="silver"
          name={mode === "hotseat" ? "실버" : (live?.players.find((p) => p.color === "silver")?.name ?? "실버")}
          active={state.turn === "silver"}
          you={you === "silver"}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-white/60">
        <span>상대 패</span>
        <CardBacks count={oppHandCount} />
        <span>더미 {mode === "hotseat" ? local?.drawPile.length : live?.game.drawCount}</span>
      </div>

      <TrafficBoard
        state={preview}
        player={you}
        interactive={carsLive}
        moveBudget={movingCars ? (Number.isFinite(poolLeft) ? poolLeft : undefined) : undefined}
        selectedId={selectedId}
        onSelect={(id) => {
          if (phase === "slide" && slideAction && slideAction.vehicleId !== id) {
            setError("직진은 한 대만");
            return;
          }
          setSelectedId(id);
        }}
        onStep={nudge}
        slideStops={phase === "slide" ? slideStops : []}
        slideChosenSteps={slideAction?.steps ?? 0}
        onPickSlide={placeSlide}
        shiftInteractive={
          shifting
            ? {
                lockedLeft: locks.left,
                lockedRight: locks.right,
                chosen: chosenShiftSide,
                onNudge: (side, rows) => shift(side, rows),
              }
            : undefined
        }
      />

      {error && <p className="text-center text-sm text-rose-300">{error}</p>}

      {waitingFriend && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-center text-sm text-amber-100">
          <p>친구에게 이 링크를 보내.</p>
          <p className="mt-1 break-all font-mono text-xs text-white">{shareUrl}</p>
          <p className="mt-2 text-lg font-black tracking-[0.35em]">{live?.code}</p>
          <Button className="mt-2 w-full" onClick={copyLink}>
            {copied ? "복사됨" : "링크 복사 / 공유"}
          </Button>
        </div>
      )}

      {winner && (
        <div className="rounded-3xl border border-white/15 bg-black/50 p-4 text-center">
          <p className="text-2xl font-black text-amber-300">
            {winner === you ? "이겼어!" : "상대가 먼저 나갔어"}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {winner === "gold" ? "골드" : "실버"} 히어로가 반대편 끝으로 완전히 빠져나왔다.
          </p>
          <a href="/" className="mt-3 inline-block text-sm text-amber-200 underline">
            로비로
          </a>
        </div>
      )}

      {myTurn && !winner && (
        <section className="space-y-3 rounded-3xl border border-white/10 bg-[#121826]/90 p-3">
          {!card || phase === "pick" ? (
            <>
              <p className="text-sm font-semibold text-white">카드 1장 내기</p>
              <CardHand cards={myHand} selectedId={null} onSelect={pickCard} />
            </>
          ) : (
            <>
              <p className="text-[11px] font-black tracking-wide text-amber-200/90">
                {card.kind === "shift"
                  ? "쉬프트 카드 · 끝 판만 위·아래"
                  : card.kind === "combo"
                    ? `콤보 카드 · 차·판 공유 ${card.moves}`
                    : card.kind === "slide"
                      ? "직진 카드 · 한 대, 원하는 칸"
                      : `이동 카드 · 차만 ${card.moves}칸`}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {card.kind === "combo" && `공유 포인트 ${poolLeft}/${card.moves}`}
                  {card.kind === "move" && `차 이동 ${poolLeft}/${card.moves}칸`}
                  {card.kind === "slide" &&
                    (slideAction
                      ? `${Math.abs(slideAction.steps)}칸 이동 · 칸을 바꿔도 됨`
                      : "차를 고르고 멈출 칸을 눌러")}
                  {card.kind === "shift" &&
                    (spentShiftPoints(actions) > 0
                      ? `세로 ${spentShiftPoints(actions)}줄 밀었어 · 더 가능`
                      : "세로 밀기 · 칸 제한 없음")}
                </p>
                <Button variant="ghost" size="sm" onClick={resetDraft}>
                  카드 취소
                </Button>
              </div>

              {card.kind === "combo" && (
                <>
                  <p className="text-xs text-white/55">
                    차 1칸과 판 1줄이 같은 포인트. 섞거나 한쪽에 몰아도 됨.
                    {poolLeft === 0 ? " 다 썼어." : ` 남은 ${poolLeft}포인트.`}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={comboMode === "move" ? "default" : "outline"}
                      className="h-12 font-black"
                      onClick={() => {
                        setComboMode("move");
                        setError("");
                      }}
                    >
                      차 밀기
                    </Button>
                    <Button
                      variant={comboMode === "shift" ? "default" : "outline"}
                      className="h-12 font-black"
                      onClick={() => {
                        setComboMode("shift");
                        setSelectedId(null);
                        setError("");
                      }}
                    >
                      판 밀기
                    </Button>
                  </div>
                </>
              )}

              {card.kind === "slide" && (
                <p className="text-xs text-white/55">
                  같은 줄에서 막히기 전 아무 칸. 끝까지 안 가도 됨. 노란 점을 누르거나 화살표로 한 칸씩.
                </p>
              )}
              {card.kind === "move" && (
                <p className="text-xs text-white/55">
                  차만 밀어. 판은 안 움직여. {poolLeft === 0 ? "이동 끝." : `이번에 ${poolLeft}칸까지.`}
                </p>
              )}
              {card.kind === "shift" && (
                <p className="text-xs text-white/55">
                  끝 판을 위·아래로. 1칸 제한 없음. 차는 못 움직여. 한 쪽만, 맞닿을 때까지.
                </p>
              )}

              {selected && carsLive && (
                <div className="flex items-center justify-center gap-2">
                  {selected.orientation === "h" ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={movingCars && poolLeft <= 0}
                        onClick={() => nudge(selected.id, -1)}
                      >
                        <ChevronLeft />
                      </Button>
                      <span className="text-xs text-white/70">
                        {phase === "slide" ? "직진 정지" : "차 밀기"} · {selected.label} 가로
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={movingCars && poolLeft <= 0}
                        onClick={() => nudge(selected.id, 1)}
                      >
                        <ChevronRight />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={movingCars && poolLeft <= 0}
                        onClick={() => nudge(selected.id, -1)}
                      >
                        <ChevronUp />
                      </Button>
                      <span className="text-xs text-white/70">
                        {phase === "slide" ? "직진 정지" : "차 밀기"} · {selected.label} 세로
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={movingCars && poolLeft <= 0}
                        onClick={() => nudge(selected.id, 1)}
                      >
                        <ChevronDown />
                      </Button>
                    </>
                  )}
                </div>
              )}

              {shifting && (
                <div className="grid grid-cols-2 gap-2">
                  <ShiftButtons
                    side="left"
                    locked={locks.left || (chosenShiftSide !== null && chosenShiftSide !== "left")}
                    offset={preview.leftShift}
                    maxUp={Math.min(
                      legalShiftSteps(preview, "left", -1),
                      card.kind === "combo" ? poolLeft : 99,
                    )}
                    maxDown={Math.min(
                      legalShiftSteps(preview, "left", 1),
                      card.kind === "combo" ? poolLeft : 99,
                    )}
                    onShift={shift}
                  />
                  <ShiftButtons
                    side="right"
                    locked={locks.right || (chosenShiftSide !== null && chosenShiftSide !== "right")}
                    offset={preview.rightShift}
                    maxUp={Math.min(
                      legalShiftSteps(preview, "right", -1),
                      card.kind === "combo" ? poolLeft : 99,
                    )}
                    maxDown={Math.min(
                      legalShiftSteps(preview, "right", 1),
                      card.kind === "combo" ? poolLeft : 99,
                    )}
                    onShift={shift}
                  />
                </div>
              )}

              <Button className="w-full" size="lg" disabled={busy} onClick={confirm}>
                턴 끝
              </Button>
            </>
          )}
        </section>
      )}

      {!myTurn && !winner && !waitingFriend && (
        <p className="py-3 text-center text-sm text-white/60">
          {mode === "hotseat" ? "상대 턴이야. 폰을 넘겨." : "상대가 카드 내는 중…"}
        </p>
      )}

      {passPhone && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4">
          <div className="w-full rounded-3xl bg-[#151b2b] p-5 text-center">
            <p className="text-lg font-black text-white">폰 넘겨줘</p>
            <p className="mt-1 text-sm text-white/65">
              이제 {hotseatColor === "gold" ? "골드" : "실버"} 차례. 패가 안 보이게 넘긴 다음 열어.
            </p>
            <Button className="mt-4 w-full" onClick={() => setPassPhone(false)}>
              내 패 보기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerChip({
  color,
  name,
  active,
  you,
}: {
  color: PlayerColor;
  name: string;
  active: boolean;
  you: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 ${
        color === "gold"
          ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
          : "border-slate-200/30 bg-slate-200/10 text-slate-100"
      } ${active ? "ring-1 ring-white/50" : "opacity-70"}`}
    >
      <div className="font-bold">{name}</div>
      <div className="text-[11px] opacity-70">
        {color === "gold" ? "골드" : "실버"} · {you ? "나" : "상대"}
        {active ? " · 턴" : ""}
      </div>
    </div>
  );
}

function ShiftButtons({
  side,
  locked,
  offset,
  maxUp,
  maxDown,
  onShift,
}: {
  side: "left" | "right";
  locked: boolean;
  offset: number;
  maxUp: number;
  maxDown: number;
  onShift: (side: "left" | "right", rows: number) => void;
}) {
  const offsetLabel = offset === 0 ? "정렬" : offset > 0 ? `아래 ${offset}줄` : `위 ${-offset}줄`;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
      <p className="mb-1 text-center text-[11px] text-white/60">
        {side === "left" ? "왼쪽 판 세로" : "오른쪽 판 세로"} · {offsetLabel}
        {locked ? " · 잠김" : ""}
      </p>
      <div className="flex flex-col items-stretch gap-1.5">
        <Button
          variant="outline"
          className="h-11 font-black"
          disabled={locked || maxUp <= 0}
          onClick={() => onShift(side, -1)}
        >
          <ChevronUp />
          위
        </Button>
        <Button
          variant="outline"
          className="h-11 font-black"
          disabled={locked || maxDown <= 0}
          onClick={() => onShift(side, 1)}
        >
          <ChevronDown />
          아래
        </Button>
      </div>
      <p className="mt-1 text-center text-[10px] text-white/50">
        남은 위 {maxUp}줄 · 아래 {maxDown}줄
      </p>
    </div>
  );
}
