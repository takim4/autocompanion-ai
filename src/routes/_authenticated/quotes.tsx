import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone, MessageCircle, ChevronRight, Loader2 } from "lucide-react";
import { listMyQuoteRequests } from "@/lib/mechanics.functions";

export const Route = createFileRoute("/_authenticated/quotes")({
  component: QuotesPage,
  head: () => ({ meta: [{ title: "Tekliflerim — AutoSocial" }] }),
});

function QuotesPage() {
  const fn = useServerFn(listMyQuoteRequests);
  const q = useQuery({ queryKey: ["my-quotes"], queryFn: () => fn() });

  return (
    <div>
      <header className="mb-4">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-dim text-primary">
            <MessageCircle className="h-4.5 w-4.5" />
          </span>
          Tekliflerim
        </h1>
        <p className="text-xs text-muted-foreground">
          Ustalara gönderdiğin teklif istekleri ve cevaplar burada.
        </p>
      </header>

      {q.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Henüz teklif istemedin. AI Teşhis sohbetinden usta seçip başlayabilirsin.
        </div>
      )}

      <ul className="space-y-3">
        {(q.data ?? []).map((r) => {
          const mech = r.mechanic as {
            id: string;
            business_name: string;
            phone: string;
            whatsapp: string | null;
            city: string;
          } | null;
          const responses = (r.responses ?? []) as Array<{
            id: string;
            price_min: number | null;
            price_max: number | null;
            currency: string;
            message: string;
            eta_days: number | null;
            created_at: string;
          }>;
          return (
            <li
              key={r.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {mech?.business_name ?? "Silinmiş usta"}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mech?.city} · {new Date(r.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                {mech && (
                  <div className="flex gap-1">
                    <a
                      href={`tel:${mech.phone.replace(/[^\d+]/g, "")}`}
                      className="rounded-md bg-secondary p-2 hover:bg-secondary/80"
                      aria-label="Ara"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/${(mech.whatsapp ?? mech.phone).replace(/[^\d+]/g, "").replace(/^\+/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-green-600 p-2 text-white hover:bg-green-700"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {r.issue_summary}
              </p>

              {responses.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {responses.map((res) => (
                    <div
                      key={res.id}
                      className="rounded-md bg-muted/50 p-2.5 text-xs"
                    >
                      <div className="mb-1 flex items-center justify-between font-medium">
                        <span>
                          {res.price_min != null && res.price_max != null
                            ? `${res.price_min.toLocaleString("tr-TR")}–${res.price_max.toLocaleString("tr-TR")} ${res.currency}`
                            : res.price_min != null
                              ? `${res.price_min.toLocaleString("tr-TR")} ${res.currency}+`
                              : "Fiyat teklifi"}
                        </span>
                        {res.eta_days != null && (
                          <span className="text-muted-foreground">
                            ~{res.eta_days} gün
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {res.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-border bg-card p-4 text-xs">
        <p className="font-medium">Usta mısın?</p>
        <p className="mt-1 text-muted-foreground">
          Kendi işletmen için profil oluşturup teklif isteklerini yönetebilirsin.
        </p>
        <Link
          to="/mechanic-panel"
          className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
        >
          Usta paneline git <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    quoted: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    accepted: "bg-green-500/15 text-green-700 dark:text-green-400",
    declined: "bg-red-500/15 text-red-700 dark:text-red-400",
    closed: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = {
    pending: "Beklemede",
    quoted: "Teklif geldi",
    accepted: "Kabul edildi",
    declined: "Reddedildi",
    closed: "Kapatıldı",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] ?? "bg-muted"}`}
    >
      {label[status] ?? status}
    </span>
  );
}
