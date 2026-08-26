import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { checkText, checkVehicle, listMyFactChecks } from "@/lib/fact-check.functions";
import { listVehicles } from "@/lib/garage.functions";
import { LoadingState } from "@/components/data-state";

export const Route = createFileRoute("/_authenticated/fact-check")({
  component: FactCheckPage,
  head: () => ({ meta: [{ title: "Doğruluk Kontrolü — AutoSocial" }] }),
});

type Verdict = {
  score: number;
  passed: boolean;
  threshold: number;
  summary: string;
  flagged_claims: Array<{
    claim: string;
    issue: string;
    correction: string;
    confidence: number;
  }>;
  sources: Array<{ title: string; url: string | null }>;
};

function FactCheckPage() {
  const [mode, setMode] = useState<"text" | "vehicle">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const vehiclesFn = useServerFn(listVehicles);
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: () => vehiclesFn() });

  const checkTextFn = useServerFn(checkText);
  const checkVehicleFn = useServerFn(checkVehicle);

  const mut = useMutation({
    mutationFn: async () => {
      if (mode === "text") {
        return checkTextFn({ data: { text, url: url.trim() || null } }) as Promise<Verdict>;
      }
      if (!vehicleId) throw new Error("Bir araç seç");
      return checkVehicleFn({ data: { vehicle_id: vehicleId } }) as Promise<Verdict>;
    },
    onSuccess: (v) => setVerdict(v),
    onError: (e: Error) => toast.error(e.message),
  });

  const historyFn = useServerFn(listMyFactChecks);
  const historyQ = useQuery({ queryKey: ["fact-checks"], queryFn: () => historyFn() });

  const canSubmit = mode === "text" ? text.trim().length >= 10 : !!vehicleId;

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-8 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">AI Doğrulama</p>
        <h1 className="font-display text-3xl font-medium tracking-tight">Doğruluk Kontrolü</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Araç özellikleri, modifiye detayları veya forum girdilerini yapay zekâ kanıta dayalı
          olarak doğrular. Skor %70'in altındaysa içerik güvenilir kabul edilmez.
        </p>
      </header>

      <div className="flex gap-6 border-b border-border text-sm">
        <button
          onClick={() => setMode("text")}
          className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${
            mode === "text" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Metin / Link
        </button>
        <button
          onClick={() => setMode("vehicle")}
          className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${
            mode === "vehicle" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Garaj Aracım
        </button>
      </div>

      <div className="py-5">
        {mode === "text" ? (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder='Örn: "2015 Golf 1.6 TDI motoruna 300 beygir tork çipiyle güvenle çıkılır, hiçbir sorun yaşanmaz."'
              className="w-full resize-none border-b border-border bg-transparent py-2 text-sm outline-none focus:border-foreground"
            />
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="İsteğe bağlı kaynak linki (forum, ilan, haber...)"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
          </div>
        ) : (
          <div>
            {vehiclesQ.isLoading ? (
              <LoadingState label="Araçlar yükleniyor..." />
            ) : (vehiclesQ.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Garajına henüz araç eklemedin.</p>
            ) : (
              <select
                value={vehicleId ?? ""}
                onChange={(e) => setVehicleId(e.target.value || null)}
                className="w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-foreground"
              >
                <option value="">Araç seç…</option>
                {(vehiclesQ.data ?? []).map(
                  (v: { id: string; brand: string; model: string; year: number }) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.brand} {v.model}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>
        )}

        <button
          onClick={() => mut.mutate()}
          disabled={!canSubmit || mut.isPending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Doğrula
        </button>
      </div>

      {verdict && <VerdictCard verdict={verdict} />}

      {historyQ.data && historyQ.data.length > 0 && (
        <div className="mt-8 border-t border-border pt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Geçmiş kontroller</h2>
          <ul className="divide-y divide-border">
            {historyQ.data.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                <span className="truncate text-muted-foreground">
                  {(h.input_text ?? "").slice(0, 70)}
                </span>
                <span className={`shrink-0 font-semibold ${h.passed ? "text-foreground" : "text-destructive"}`}>
                  %{Math.round(h.score * 100)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const pct = Math.round(verdict.score * 100);

  return (
    <div className="space-y-4 border-t border-border py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {verdict.passed ? (
            <CheckCircle2 className="h-5 w-5 text-foreground" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <span className="text-sm font-semibold">
            {verdict.passed ? "Doğruluk eşiğini geçti" : "Doğruluk eşiğinin altında"}
          </span>
        </div>
        <span className="font-display text-2xl font-medium">%{pct}</span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${verdict.passed ? "bg-foreground" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-sm text-muted-foreground">{verdict.summary}</p>

      {verdict.flagged_claims.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" /> İşaretlenen iddialar
          </h3>
          {verdict.flagged_claims.map((c, i) => (
            <div key={i} className="border-l-2 border-destructive/40 pl-3 text-xs">
              <p className="font-medium">"{c.claim}"</p>
              <p className="mt-1 text-muted-foreground">{c.issue}</p>
              <p className="mt-1 text-foreground">
                <span className="font-medium">Doğrusu:</span> {c.correction}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Güven: %{Math.round(c.confidence * 100)}
              </p>
            </div>
          ))}
        </div>
      )}

      {verdict.sources.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kaynaklar</h3>
          <ul className="space-y-1">
            {verdict.sources.map((s, i) => (
              <li key={i} className="text-[11px]">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    {s.title}
                  </a>
                ) : (
                  <span className="text-muted-foreground">{s.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
