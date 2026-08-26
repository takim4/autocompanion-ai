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
import { cn } from "@/lib/utils";

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
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">/ 02 · {q.data?.length ?? 0} araç</p>
          <h1 className="font-display text-5xl font-medium leading-none tracking-tight sm:text-6xl">Garajım</h1>
        </div>
        <Button asChild variant="brand" size="lg">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((v, i) => (
            <article
              key={v.id}
              className={cn(
                "cut card-interactive group relative flex flex-col justify-between border border-border p-6",
                i === 0 && "sm:col-span-2 sm:row-span-2 lg:col-span-2",
              )}
            >
              <button
                onClick={() => del.mutate(v.id)}
                className="absolute right-3 top-3 p-1.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div>
                <Car className={cn("mb-4 text-muted-foreground/50", i === 0 ? "h-10 w-10" : "h-7 w-7")} strokeWidth={1.25} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {v.brand} · {v.year}
                </p>
                <h2 className={cn("mt-1 font-display font-medium tracking-tight", i === 0 ? "text-4xl" : "text-2xl")}>
                  {v.nickname ?? v.model}
                </h2>
                {v.nickname && <p className="text-sm text-muted-foreground">{v.model}</p>}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-xs">
                {v.mileage_km != null && (
                  <div>
                    <dt className="text-muted-foreground">Kilometre</dt>
                    <dd className="mt-0.5 font-display text-lg font-medium">{v.mileage_km.toLocaleString("tr-TR")}</dd>
                  </div>
                )}
                {v.fuel && (
                  <div>
                    <dt className="text-muted-foreground">Yakıt</dt>
                    <dd className="mt-0.5 font-display text-lg font-medium">{FUEL_LABELS[v.fuel]}</dd>
                  </div>
                )}
                {v.transmission && (
                  <div>
                    <dt className="text-muted-foreground">Şanzıman</dt>
                    <dd className="mt-0.5 font-display text-lg font-medium">{TRANSMISSION_LABELS[v.transmission]}</dd>
                  </div>
                )}
                {v.engine_cc && (
                  <div>
                    <dt className="text-muted-foreground">Motor</dt>
                    <dd className="mt-0.5 font-display text-lg font-medium">{v.engine_cc} cc</dd>
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
