import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Car, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/data-state";
import { deleteVehicle, listVehicles } from "@/lib/garage.functions";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/car-data";

export const Route = createFileRoute("/_authenticated/garage/")({
  component: GaragePage,
  head: () => ({ meta: [{ title: "Garajım — AutoSocial" }] }),
});

function GaragePage() {
  const qc = useQueryClient();
  const fetchVehicles = useServerFn(listVehicles);
  const removeFn = useServerFn(deleteVehicle);

  const q = useQuery({ queryKey: ["vehicles"], queryFn: () => fetchVehicles() });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Araç silindi");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Silinemedi"),
  });

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Garajım</h1>
          <p className="text-sm text-muted-foreground">
            Kayıtlı araçlarını yönet
          </p>
        </div>
        <Button asChild variant="brand">
          <Link to="/garage/new">
            <Plus className="mr-1.5 h-4 w-4" /> Araç Ekle
          </Link>
        </Button>
      </header>

      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.length === 0 && (
        <EmptyState
          icon={Car}
          title="Garajın boş"
          description="İlk aracını ekle, kronik sorunları ve topluluk çözümlerini gör."
          action={
            <Button asChild variant="brand">
              <Link to="/garage/new">
                <Plus className="mr-1.5 h-4 w-4" /> İlk Aracını Ekle
              </Link>
            </Button>
          }
        />
      )}

      {q.data && q.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((v) => (
            <article
              key={v.id}
              className="card-interactive group relative rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {v.brand}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {v.nickname ?? v.model}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {v.model} · {v.year}
                  </p>
                </div>
                <button
                  onClick={() => del.mutate(v.id)}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {v.mileage_km != null && (
                  <div>
                    <dt className="text-muted-foreground">Kilometre</dt>
                    <dd className="font-medium">
                      {v.mileage_km.toLocaleString("tr-TR")}
                    </dd>
                  </div>
                )}
                {v.fuel && (
                  <div>
                    <dt className="text-muted-foreground">Yakıt</dt>
                    <dd className="font-medium">{FUEL_LABELS[v.fuel]}</dd>
                  </div>
                )}
                {v.transmission && (
                  <div>
                    <dt className="text-muted-foreground">Şanzıman</dt>
                    <dd className="font-medium">
                      {TRANSMISSION_LABELS[v.transmission]}
                    </dd>
                  </div>
                )}
                {v.engine_cc && (
                  <div>
                    <dt className="text-muted-foreground">Motor</dt>
                    <dd className="font-medium">{v.engine_cc} cc</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
