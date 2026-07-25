import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, MapPin, ShieldAlert, Wrench, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { getMyRoles } from "@/lib/garage.functions";
import { geocodeMechanicLocation, listAllMechanicsAdmin } from "@/lib/admin-mechanics.functions";

export const Route = createFileRoute("/_authenticated/admin/mechanics")({
  component: AdminMechanicsPage,
  head: () => ({ meta: [{ title: "Usta Konumları — AutoSocial" }] }),
});

function AdminMechanicsPage() {
  const rolesFn = useServerFn(getMyRoles);
  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });

  if (rolesQ.isLoading) return <LoadingState />;
  if (!rolesQ.data?.includes("admin")) {
    return (
      <EmptyState
        title="Bu sayfa sadece uygulama adminlerine açık"
        description="Görüntülemek için admin yetkisi gerekiyor."
        icon={ShieldAlert}
      />
    );
  }
  return <MechanicLocations />;
}

type MechanicRow = {
  id: string;
  business_name: string;
  address: string;
  city: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  active: boolean;
};

function MechanicLocations() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllMechanicsAdmin);
  const geocodeFn = useServerFn(geocodeMechanicLocation);
  const q = useQuery({ queryKey: ["admin-mechanics"], queryFn: () => listFn() });

  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  const geocodeOne = async (m: MechanicRow) => {
    setRunningId(m.id);
    try {
      const row = await geocodeFn({ data: { mechanic_id: m.id } });
      setResults((prev) => ({
        ...prev,
        [m.id]: {
          ok: true,
          message: `${row.lat?.toFixed(5)}, ${row.lng?.toFixed(5)} — ${row.formatted_address}`,
        },
      }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [m.id]: { ok: false, message: e instanceof Error ? e.message : "Bilinmeyen hata" },
      }));
    } finally {
      setRunningId(null);
    }
  };

  const geocodeMut = useMutation({
    mutationFn: (m: MechanicRow) => geocodeOne(m),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mechanics"] }),
  });

  const runBulk = async () => {
    const rows = q.data ?? [];
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: rows.length });
    for (let i = 0; i < rows.length; i++) {
      await geocodeOne(rows[i]);
      setBulkProgress({ done: i + 1, total: rows.length });
      // Google Geocoding API oran sınırlarına takılmamak için küçük bir bekleme
      await new Promise((r) => setTimeout(r, 250));
    }
    setBulkRunning(false);
    qc.invalidateQueries({ queryKey: ["admin-mechanics"] });
    toast.success("Tüm ustaların konumu yeniden hesaplandı.");
  };

  if (q.isLoading) return <LoadingState />;
  const rows = (q.data ?? []) as MechanicRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Wrench className="h-6 w-6" /> Usta Konumları
        </h1>
        <Button size="sm" onClick={runBulk} disabled={bulkRunning || rows.length === 0}>
          {bulkRunning ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              {bulkProgress.done}/{bulkProgress.total}
            </>
          ) : (
            "Tümünü Google Maps ile düzelt"
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Önceden Apify ile eklenen usta konumları hatalıydı (uzak sonuçlar dönüyordu). Bu araç,
        Lovable'a bağlanan Google Maps (Geocoding API) ile her ustanın adresini yeniden çözüp
        lat/lng'i günceller.
      </p>

      {rows.length === 0 && <EmptyState title="Kayıtlı usta yok" />}

      <ul className="space-y-2">
        {rows.map((m) => {
          const result = results[m.id];
          const isRunning = runningId === m.id;
          return (
            <li key={m.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.business_name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {m.address}, {m.district ? `${m.district}, ` : ""}
                    {m.city}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Mevcut koordinat:{" "}
                    {m.lat != null && m.lng != null
                      ? `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`
                      : "yok"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 text-[11px]"
                  onClick={() => geocodeMut.mutate(m)}
                  disabled={isRunning || bulkRunning}
                >
                  {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Google ile düzelt"
                  )}
                </Button>
              </div>
              {result && (
                <p
                  className={`mt-2 flex items-start gap-1 text-[11px] ${result.ok ? "text-green-600" : "text-destructive"}`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  )}
                  {result.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
