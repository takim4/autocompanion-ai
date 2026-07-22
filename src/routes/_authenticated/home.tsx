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
    <div className="space-y-6">
      {/* Hikayeler + akış kısayolu */}
      <section className="-mx-4 border-b border-border bg-card/40 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hikayeler & Canlı
          </h3>
          <Button asChild size="sm" variant="ghost" className="h-6 text-xs">
            <Link to="/feed">
              Akışı aç <Play className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <Link
            to="/feed"
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border bg-card">
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Ekle</span>
          </Link>
          {HOME_STORIES.map((s) => (
            <Link
              key={s.id}
              to="/feed"
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div
                className={`rounded-full p-[2px] ${
                  s.live
                    ? "bg-gradient-to-tr from-red-500 to-orange-500"
                    : "bg-gradient-to-tr from-primary via-accent to-primary"
                }`}
              >
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-background bg-card text-xl">
                  {s.avatar}
                  {s.live && (
                    <span className="absolute -bottom-1 rounded-sm bg-red-600 px-1 text-[8px] font-bold text-white">
                      CANLI
                    </span>
                  )}
                </div>
              </div>
              <span className="max-w-[56px] truncate text-[10px]">{s.user}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Reels & Canlı kısayol kartları */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/feed"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-600 to-purple-900 p-5"
        >
          <Play className="h-8 w-8 text-white/90" />
          <p className="mt-3 text-lg font-bold text-white">Reels</p>
          <p className="text-xs text-white/80">Otomobil videoları — dikey akış</p>
        </Link>
        <Link
          to="/feed"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-slate-900 p-5"
        >
          <div className="flex items-center gap-2">
            <Radio className="h-8 w-8 text-white/90" />
            <span className="flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              2 CANLI
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-white">Canlı Yayınlar</p>
          <p className="text-xs text-white/80">Ustalarla anlık soru & cevap</p>
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
