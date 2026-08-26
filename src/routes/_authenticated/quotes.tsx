import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";
import { listMyQuoteRequests } from "@/lib/mechanics.functions";

export const Route = createFileRoute("/_authenticated/quotes")({
  component: QuotesPage,
  head: () => ({ meta: [{ title: "Tekliflerim — AutoSocial" }] }),
});

function QuotesPage() {
  const fn = useServerFn(listMyQuoteRequests);
  const q = useQuery({ queryKey: ["my-quotes"], queryFn: () => fn() });

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {q.data?.length ?? 0} teklif isteği
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight">Tekliflerim</h1>
      </header>

      {q.isLoading && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}

      {q.data && q.data.length === 0 && (
        <div className="border-t border-border py-12 text-center text-sm text-muted-foreground">
          Henüz teklif istemedin. AI Teşhis sohbetinden usta seçip başlayabilirsin.
        </div>
      )}

      <ul className="divide-y divide-border">
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
            <li key={r.id} className="py-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{mech?.business_name ?? "Silinmiş usta"}</h3>
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
                      className="rounded-full border border-border p-2 hover:border-foreground"
                      aria-label="Ara"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/${(mech.whatsapp ?? mech.phone).replace(/[^\d+]/g, "").replace(/^\+/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border p-2 hover:border-foreground"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.issue_summary}</p>

              {responses.length > 0 && (
                <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
                  {responses.map((res) => (
                    <div key={res.id} className="text-xs">
                      <div className="mb-1 flex items-center justify-between font-medium">
                        <span>
                          {res.price_min != null && res.price_max != null
                            ? `${res.price_min.toLocaleString("tr-TR")}–${res.price_max.toLocaleString("tr-TR")} ${res.currency}`
                            : res.price_min != null
                              ? `${res.price_min.toLocaleString("tr-TR")} ${res.currency}+`
                              : "Fiyat teklifi"}
                        </span>
                        {res.eta_days != null && <span className="text-muted-foreground">~{res.eta_days} gün</span>}
                      </div>
                      <p className="whitespace-pre-wrap text-muted-foreground">{res.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 border-t border-border pt-5 text-xs">
        <p className="font-medium">Usta mısın?</p>
        <p className="mt-1 text-muted-foreground">
          Kendi işletmen için profil oluşturup teklif isteklerini yönetebilirsin.
        </p>
        <Link to="/mechanic-panel" className="mt-2 inline-flex items-center gap-1 font-semibold underline">
          Usta paneline git <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    pending: "Beklemede",
    quoted: "Teklif geldi",
    accepted: "Kabul edildi",
    declined: "Reddedildi",
    closed: "Kapatıldı",
  };
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label[status] ?? status}
    </span>
  );
}
