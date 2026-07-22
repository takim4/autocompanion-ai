import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Car, Play, Plus, Radio, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/data-state";
import { listVehicles } from "@/lib/garage.functions";

const HOME_STORIES = [
  { id: "1", user: "ahmet_gt", avatar: "🏎️", live: false },
  { id: "2", user: "garaj42", avatar: "🔧", live: true },
  { id: "3", user: "bmwlife", avatar: "🚗", live: false },
  { id: "4", user: "dieselking", avatar: "⛽", live: false },
  { id: "5", user: "elektrikci", avatar: "⚡", live: false },
  { id: "6", user: "usta_mehmet", avatar: "🛠️", live: true },
];

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
  head: () => ({ meta: [{ title: "Ana Sayfa — AutoSocial" }] }),
});

function HomePage() {
  const fetchVehicles = useServerFn(listVehicles);
  const q = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => fetchVehicles(),
  });

  return (
    <div className="space-y-8">
      {/* AI arıza kutusu */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Aracınla ilgili bir sorun mu var?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Belirtileri anlat, AI teşhis + topluluk çözümü sıraya dizsin.
            </p>
            <Button asChild className="mt-4">
              <Link to="/ai-chat">AI Teşhis Başlat</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Garaj özeti */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Car className="h-4 w-4" /> Garajım
          </h3>
          <Button asChild size="sm" variant="ghost">
            <Link to="/garage">Tümü →</Link>
          </Button>
        </div>
        {q.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (q.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="Henüz araç yok"
            description="İlk aracını ekle, sana özel içerikleri görelim."
            action={
              <Button asChild size="sm">
                <Link to="/garage/new">
                  <Plus className="mr-1 h-4 w-4" /> Araç Ekle
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.data!.slice(0, 4).map((v) => (
              <Link
                key={v.id}
                to="/garage"
                className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
              >
                <p className="text-xs uppercase text-muted-foreground">{v.brand}</p>
                <p className="font-semibold">
                  {v.model} <span className="text-muted-foreground">· {v.year}</span>
                </p>
                {v.mileage_km != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {v.mileage_km.toLocaleString("tr-TR")} km
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trend arızalar placeholder */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4" /> Bu Hafta Trend
        </h3>
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Topluluk verisi biriktikçe burada popüler arıza & çözümler listelenecek.
        </div>
      </section>
    </div>
  );
}
