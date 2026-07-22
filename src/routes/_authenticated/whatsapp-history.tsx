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
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">WhatsApp Geçmişi</h1>
        <p className="text-xs text-muted-foreground">
          Ustalara gönderdiğin teşhis mesajları tarih ve usta bilgisiyle burada saklanır.
        </p>
      </header>

      {q.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Henüz WhatsApp mesajı gönderilmemiş.
        </div>
      )}

      <ul className="space-y-3">
        {(q.data ?? []).map((row) => {
          const mech = (row as { mechanics: { business_name: string; city: string; district: string | null; phone: string; whatsapp: string | null } | null }).mechanics;
          const businessName = mech?.business_name ?? "Usta";
          const location = mech ? `${mech.district ? mech.district + ", " : ""}${mech.city}` : "";
          const cleanWa = (row.phone ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "");
          const waHref = `https://wa.me/${cleanWa}?text=${encodeURIComponent(row.message)}`;
          const isOpen = openId === row.id;
          return (
            <li key={row.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <h3 className="truncate text-sm font-semibold">{businessName}</h3>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(row.created_at)}
                    {location && <> · {location}</>}
                    {row.phone && <> · {row.phone}</>}
                  </p>
                  {row.specialties && row.specialties.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.specialties.slice(0, 4).map((s: string) => (
                        <span
                          key={s}
                          className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] text-accent-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setOpenId(isOpen ? null : row.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary"
                  aria-label={isOpen ? "Gizle" : "Göster"}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {isOpen && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-secondary/50 p-2 text-[12px] leading-relaxed">
                  {row.message}
                </pre>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700"
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
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium hover:bg-secondary/80"
                >
                  <Copy className="h-3 w-3" /> Kopyala
                </button>
                <button
                  onClick={() => {
                    if (confirm("Bu kaydı silmek istiyor musun?")) delM.mutate(row.id);
                  }}
                  disabled={delM.isPending}
                  className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
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
