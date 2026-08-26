import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Plus, Send, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  sendMessage,
} from "@/lib/chat.functions";
import { listVehicles } from "@/lib/garage.functions";
import { MechanicSuggestions } from "@/components/mechanic-suggestions";
import {
  parseSpecialtiesFromAI,
  parseStatusFromAI,
  SUPPORT_STATUS_LABELS,
  type Specialty,
} from "@/lib/mechanic-data";

export const Route = createFileRoute("/_authenticated/ai-chat")({
  component: AiChatPage,
  head: () => ({ meta: [{ title: "Destek Asistanı — AutoSocial" }] }),
});

function AiChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const del = useServerFn(deleteConversation);
  const vehicles = useServerFn(listVehicles);

  const convQ = useQuery({ queryKey: ["conversations"], queryFn: () => list() });
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: () => vehicles() });

  const createMut = useMutation({
    mutationFn: (vehicle_id: string | null) => create({ data: { vehicle_id } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (activeId === id) setActiveId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!activeId && convQ.data && convQ.data.length > 0) {
      setActiveId(convQ.data[0].id);
    }
  }, [convQ.data, activeId]);

  return (
    <div>
      <header className="mb-6 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">AI Ajanı</p>
        <h1 className="font-display text-3xl font-medium tracking-tight">Destek Asistanı</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sorununu anlat, ön çözüm alalım; gerekirse yakınındaki doğrulanmış bir ustaya yönlendirelim.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          <NewChatButton
            vehicles={vehiclesQ.data ?? []}
            onCreate={(vid) => createMut.mutate(vid)}
            loading={createMut.isPending}
          />
          <ul className="space-y-0.5">
            {(convQ.data ?? []).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`group flex w-full items-center justify-between gap-2 border-l-2 px-3 py-2 text-left text-xs font-medium transition-colors ${
                    activeId === c.id
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{c.title}</span>
                  <Trash2
                    className="h-3.5 w-3.5 shrink-0 opacity-0 hover:text-destructive group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Sohbet silinsin mi?")) delMut.mutate(c.id);
                    }}
                  />
                </button>
              </li>
            ))}
            {convQ.data && convQ.data.length === 0 && (
              <li className="px-3 text-xs text-muted-foreground">Henüz sohbet yok.</li>
            )}
          </ul>
        </aside>

        <section className="min-h-[60vh] rounded-2xl border border-border">
          {activeId ? (
            <ChatWindow conversationId={activeId} />
          ) : (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Sol menüden bir sohbet seç ya da yeni bir teşhis sohbeti başlat.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function NewChatButton({
  vehicles,
  onCreate,
  loading,
}: {
  vehicles: Array<{ id: string; brand: string; model: string; year: number }>;
  onCreate: (vehicleId: string | null) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-3 py-2 text-xs font-semibold disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Yeni sohbet
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-border bg-popover p-1 shadow-xl">
          <button
            onClick={() => {
              onCreate(null);
              setOpen(false);
            }}
            className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-secondary"
          >
            Genel sohbet (araç seçme)
          </button>
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                onCreate(v.id);
                setOpen(false);
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-secondary"
            >
              {v.year} {v.brand} {v.model}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatWindow({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();
  const get = useServerFn(getConversation);
  const send = useServerFn(sendMessage);
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => get({ data: { id: conversationId } }),
  });

  const sendMut = useMutation({
    mutationFn: (content: string) => send({ data: { conversation_id: conversationId, content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [q.data?.messages.length, sendMut.isPending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v || sendMut.isPending) return;
    setInput("");
    sendMut.mutate(v);
  };

  const messages = q.data?.messages ?? [];

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[420px] flex-col md:h-[70vh]">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {messages.length === 0 && !sendMut.isPending && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Aracının belirtisini, hata koduyla birlikte veya olabildiğince detaylı yaz. Örn: "Soğuk
            çalıştırmada 1500 devirde titreşim, MIL yanıyor, P0301."
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            <MessageBubble role={m.role} content={m.content} />
            {m.role === "assistant" &&
              (() => {
                const status = parseStatusFromAI(m.content);
                const statusNeedsMechanic =
                  status === "uzman_gerekli" || /\b(usta|servis|uzman|tamirci)\b/i.test(m.content);
                const parsedSpecs = parseSpecialtiesFromAI(m.content);
                const specs: Specialty[] =
                  parsedSpecs.length > 0 ? parsedSpecs : statusNeedsMechanic ? ["genel bakım"] : [];
                return (
                  <>
                    {status && (
                      <span className="ml-9 mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {SUPPORT_STATUS_LABELS[status]}
                      </span>
                    )}
                    {specs.length > 0 && (
                      <MechanicSuggestions
                        specialties={specs}
                        diagnosisSnapshot={m.content}
                        conversationId={conversationId}
                        vehicleId={q.data?.conversation?.vehicle_id ?? null}
                      />
                    )}
                  </>
                );
              })()}
          </div>
        ))}
        {sendMut.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Destek Asistanı yazıyor…
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          rows={2}
          placeholder="Sorunu yaz…"
          className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
          disabled={sendMut.isPending}
        />
        <button
          type="submit"
          disabled={sendMut.isPending || !input.trim()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient disabled:opacity-50"
          aria-label="Gönder"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary-dim text-foreground" : "bg-brand-gradient"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm border border-border bg-card"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-headings:my-2 prose-headings:font-display">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
