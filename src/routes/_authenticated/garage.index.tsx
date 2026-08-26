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
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {q.data?.length ?? 0} kayıtlı araç
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">Garajım</h1>
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
        <div className="divide-y divide-border">
          {q.data.map((v) => (
            <article key={v.id} className="group flex items-start justify-between gap-4 py-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {v.brand} · {v.year}
                </p>
                <h2 className="mt-1 font-display text-2xl font-medium tracking-tight">
                  {v.nickname ?? v.model}
                </h2>
                {v.nickname && <p className="text-sm text-muted-foreground">{v.model}</p>}

                <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs">
                  {v.mileage_km != null && (
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">Kilometre</dt>
                      <dd className="font-semibold">{v.mileage_km.toLocaleString("tr-TR")}</dd>
                    </div>
                  )}
                  {v.fuel && (
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">Yakıt</dt>
                      <dd className="font-semibold">{FUEL_LABELS[v.fuel]}</dd>
                    </div>
                  )}
                  {v.transmission && (
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">Şanzıman</dt>
                      <dd className="font-semibold">{TRANSMISSION_LABELS[v.transmission]}</dd>
                    </div>
                  )}
                  {v.engine_cc && (
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">Motor</dt>
                      <dd className="font-semibold">{v.engine_cc} cc</dd>
                    </div>
                  )}
                </dl>
              </div>
              <button
                onClick={() => del.mutate(v.id)}
                className="rounded-full p-2 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
