import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, Plus, Send, Trash2, User } from "lucide-react";
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
import { parseSpecialtiesFromAI } from "@/lib/mechanic-data";

export const Route = createFileRoute("/_authenticated/ai-chat")({
  component: AiChatPage,
  head: () => ({ meta: [{ title: "AI Teşhis — AutoSocial" }] }),
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
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-primary" /> AI Teşhis
          </h1>
          <p className="text-xs text-muted-foreground">
            Aracına özel yanıtlar için sohbet başlatırken bir araç seç.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          <NewChatButton
            vehicles={vehiclesQ.data ?? []}
            onCreate={(vid) => createMut.mutate(vid)}
            loading={createMut.isPending}
          />
          <ul className="space-y-1">
            {(convQ.data ?? []).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`group flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-xs transition-colors ${
                    activeId === c.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  <span className="truncate">{c.title}</span>
                  <Trash2
                    className="ml-2 h-3.5 w-3.5 shrink-0 opacity-0 hover:text-destructive group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Sohbet silinsin mi?")) delMut.mutate(c.id);
                    }}
                  />
                </button>
              </li>
            ))}
            {convQ.data && convQ.data.length === 0 && (
              <li className="text-xs text-muted-foreground">Henüz sohbet yok.</li>
            )}
          </ul>
        </aside>

        <section className="min-h-[60vh] rounded-lg border border-border bg-card">
          {activeId ? (
            <ChatWindow conversationId={activeId} />
          ) : (
            <div className="flex h-full min-h-[50vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Sol menüden bir sohbet seç ya da <br /> yeni bir teşhis sohbeti başlat.
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
        className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Yeni sohbet
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-border bg-popover p-1 shadow-lg">
          <button
            onClick={() => {
              onCreate(null);
              setOpen(false);
            }}
            className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
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
              className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
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
    mutationFn: (content: string) =>
      send({ data: { conversation_id: conversationId, content } }),
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
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !sendMut.isPending && (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Aracının belirtisini, hata koduyla birlikte veya olabildiğince detaylı yaz. Örn:
            "Soğuk çalıştırmada 1500 devirde titreşim, MIL yanıyor, P0301."
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {sendMut.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Teşhis Uzmanı yazıyor…
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex items-end gap-2 border-t border-border p-3"
      >
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
          className="min-h-[44px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={sendMut.isPending}
        />
        <button
          type="submit"
          disabled={sendMut.isPending || !input.trim()}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Gönder
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
