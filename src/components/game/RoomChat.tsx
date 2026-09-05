"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, PlayerColor } from "@/lib/game/types";
import { Button } from "@/components/ui/button";

export function RoomChat({
  messages,
  you,
  onSend,
}: {
  messages: ChatMessage[];
  you: PlayerColor | null;
  onSend: (text: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const unread = useMemo(
    () => (open ? 0 : messages.filter((m) => m.at > seen && m.color !== you).length),
    [messages, open, seen, you],
  );

  useEffect(() => {
    if (!open) return;
    const last = messages[messages.length - 1]?.at ?? Date.now();
    setSeen(last);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onSend(text);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="톡"
        className="relative"
      >
        <MessageCircle className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-amber-400 px-1 text-[10px] font-black text-zinc-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/55" onClick={() => setOpen(false)}>
          <div
            className="mx-auto flex h-[58dvh] w-full max-w-md flex-col rounded-t-3xl border border-white/10 bg-[#121826] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-white">방 톡</p>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="닫기">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="pt-8 text-center text-sm text-white/45">아직 톡이 없어. 짧게 보내.</p>
              )}
              {messages.map((msg) => {
                const mine = msg.color === you;
                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-amber-400 text-zinc-950" : "bg-white/10 text-white"
                      }`}
                    >
                      <p className={`text-[10px] font-semibold ${mine ? "text-zinc-700" : "text-white/55"}`}>
                        {msg.name}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 200))}
                placeholder="메시지"
                maxLength={200}
                className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none"
              />
              <Button type="submit" disabled={busy || !draft.trim()}>
                보내기
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
