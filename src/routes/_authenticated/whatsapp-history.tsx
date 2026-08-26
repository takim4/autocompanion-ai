import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Trash2, Copy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listWhatsappMessages,
  deleteWhatsappMessage,
} from "@/lib/whatsapp-history.functions";

export const Route = createFileRoute("/_authenticated/whatsapp-history")({
  component: WhatsappHistoryPage,
  head: () => ({
    meta: [
      { title: "WhatsApp Geçmişi — AutoSocial" },
      {
        name: "description",
        content:
          "Ustalara gönderdiğin WhatsApp teşhis mesajlarını tarih ve usta bilgisiyle sakla, tekrar gönder.",
      },
    ],
  }),
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WhatsappHistoryPage() {
  const listFn = useServerFn(listWhatsappMessages);
  const delFn = useServerFn(deleteWhatsappMessage);
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["whatsapp-history"],
    queryFn: () => listFn(),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-history"] });
      toast.success("Silindi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {q.data?.length ?? 0} kayıtlı mesaj
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight">WhatsApp Geçmişi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ustalara gönderdiğin teşhis mesajları tarih ve usta bilgisiyle burada saklanır.
        </p>
      </header>

      {q.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="border-t border-border py-12 text-center text-sm text-muted-foreground">
          Henüz WhatsApp mesajı gönderilmemiş.
        </div>
      )}

      <ul className="divide-y divide-border">
        {(q.data ?? []).map((row) => {
          const mech = (row as { mechanics: { business_name: string; city: string; district: string | null; phone: string; whatsapp: string | null } | null }).mechanics;
          const businessName = mech?.business_name ?? "Usta";
          const location = mech ? `${mech.district ? mech.district + ", " : ""}${mech.city}` : "";
          const cleanWa = (row.phone ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "");
          const waHref = `https://wa.me/${cleanWa}?text=${encodeURIComponent(row.message)}`;
          const isOpen = openId === row.id;
          return (
            <li key={row.id} className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="truncate text-sm font-semibold">{businessName}</h3>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(row.created_at)}
                    {location && <> · {location}</>}
                    {row.phone && <> · {row.phone}</>}
                  </p>
                  {row.specialties && row.specialties.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                      {row.specialties.slice(0, 4).map((s: string) => (
                        <span key={s}>#{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setOpenId(isOpen ? null : row.id)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
                  aria-label={isOpen ? "Gizle" : "Göster"}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {isOpen && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap border-l-2 border-border pl-3 text-[12px] leading-relaxed text-muted-foreground">
                  {row.message}
                </pre>
              )}

              <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <MessageCircle className="h-3 w-3" /> Tekrar gönder
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(row.message).then(
                      () => toast.success("Mesaj kopyalandı"),
                      () => toast.error("Kopyalanamadı"),
                    );
                  }}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" /> Kopyala
                </button>
                <button
                  onClick={() => {
                    if (confirm("Bu kaydı silmek istiyor musun?")) delM.mutate(row.id);
                  }}
                  disabled={delM.isPending}
                  className="inline-flex items-center gap-1 text-destructive hover:underline disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Sil
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
