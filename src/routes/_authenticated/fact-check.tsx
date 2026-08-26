import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, Loader2, ShieldCheck, XCircle } from "lucide-react";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-dim text-primary">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          Doğruluk Kontrolü
        </h1>
        <p className="text-xs text-muted-foreground">
          Araç özellikleri, modifiye detayları veya forum girdilerini yapay zekâ kanıta dayalı
          olarak doğrular. Skor %70'in altındaysa içerik güvenilir kabul edilmez.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex gap-1 rounded-xl bg-muted p-1 text-xs">
          <button
            onClick={() => setMode("text")}
            className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${
              mode === "text" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Metin / Link
          </button>
          <button
            onClick={() => setMode("vehicle")}
            className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${
              mode === "vehicle" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Garaj Aracım
          </button>
        </div>

        {mode === "text" ? (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder='Örn: "2015 Golf 1.6 TDI motoruna 300 beygir tork çipiyle güvenle çıkılır, hiçbir sorun yaşanmaz."'
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="İsteğe bağlı kaynak linki (forum, ilan, haber...)"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_hsl(var(--shadow-color)/0.6)] disabled:opacity-50"
        >
          {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Doğrula
        </button>
      </div>

      {verdict && <VerdictCard verdict={verdict} />}

      {historyQ.data && historyQ.data.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Geçmiş kontroller</h2>
          <ul className="space-y-1.5">
            {historyQ.data.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
              >
                <span className="truncate text-muted-foreground">
                  {(h.input_text ?? "").slice(0, 70)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                    h.passed
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
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
  const color = verdict.passed ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {verdict.passed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <span className="text-sm font-semibold">
            {verdict.passed ? "Doğruluk eşiğini geçti" : "Doğruluk eşiğinin altında"}
          </span>
        </div>
        <span className="text-lg font-bold">%{pct}</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-sm text-muted-foreground">{verdict.summary}</p>

      {verdict.flagged_claims.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> İşaretlenen iddialar
          </h3>
          {verdict.flagged_claims.map((c, i) => (
            <div
              key={i}
              className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs"
            >
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
        <div>
          <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Kaynaklar</h3>
          <ul className="space-y-1">
            {verdict.sources.map((s, i) => (
              <li key={i} className="text-[11px]">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
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
