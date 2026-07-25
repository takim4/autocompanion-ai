import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Car, Play, Plus, Radio, Store, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/data-state";
import { listVehicles } from "@/lib/garage.functions";
import { listLivePosts } from "@/lib/social.functions";

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
  const liveFn = useServerFn(listLivePosts);
  const liveQ = useQuery({ queryKey: ["live-posts"], queryFn: () => liveFn() });
  const liveCount = liveQ.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Reels & Canlı kısayol kartları */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/feed"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-600 to-purple-900 p-5"
        >
          <Play className="h-8 w-8 text-white/90" />
          <p className="mt-3 text-lg font-bold text-white">Akış</p>
          <p className="text-xs text-white/80">Fotoğraf, video ve gönderiler</p>
        </Link>
        <Link
          to="/feed"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-slate-900 p-5"
        >
          <div className="flex items-center gap-2">
            <Radio className="h-8 w-8 text-white/90" />
            {liveCount > 0 && (
              <span className="flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {liveCount} CANLI
              </span>
            )}
          </div>
          <p className="mt-3 text-lg font-bold text-white">Canlı Yayınlar</p>
          <p className="text-xs text-white/80">Sorularını canlı sohbetle sor</p>
        </Link>
      </section>

      {/* Hizmetler & Topluluklar */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/services"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Hizmetler</p>
            <p className="text-xs text-muted-foreground">Yakındaki ustalar & puanlar</p>
          </div>
        </Link>
        <Link
          to="/communities"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Topluluklar</p>
            <p className="text-xs text-muted-foreground">Marka/model toplulukları</p>
          </div>
        </Link>
      </section>

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
