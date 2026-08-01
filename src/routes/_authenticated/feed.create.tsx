import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  Circle,
  FlipHorizontal2,
  Radio,
  Sparkles,
  Timer,
  Video as VideoIcon,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed/create")({
  component: FeedCreatePage,
  head: () => ({ meta: [{ title: "Oluştur — AutoSocial" }] }),
});

type Mode = "video" | "foto" | "canli";
const DAILY_LIMIT = 5;
const USED_TODAY = 2;

function FeedCreatePage() {
  const [mode, setMode] = useState<Mode>("video");
  const [recording, setRecording] = useState(false);

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-8.5rem)] flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          to="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Vazgeç
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Bugünkü hakkın
          </span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(USED_TODAY / DAILY_LIMIT) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold">
            {USED_TODAY}/{DAILY_LIMIT}
          </span>
        </div>
      </div>

      <div className="flex flex-1 gap-2 px-4">
        {/* Çekim alanı */}
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black">
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <Camera className="h-16 w-16" />
          </div>
          {mode === "canli" && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              CANLI
            </span>
          )}
          {recording && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Kaydediliyor
            </span>
          )}
        </div>

        {/* Yan araç çubuğu */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-4 rounded-2xl border border-border bg-card py-4">
          <button className="text-muted-foreground hover:text-foreground" aria-label="Flaş">
            <Zap className="h-5 w-5" />
          </button>
          <button
            className="text-muted-foreground hover:text-foreground"
            aria-label="Kamerayı çevir"
          >
            <FlipHorizontal2 className="h-5 w-5" />
          </button>
          <button className="text-muted-foreground hover:text-foreground" aria-label="Zamanlayıcı">
            <Timer className="h-5 w-5" />
          </button>
          <button className="text-muted-foreground hover:text-foreground" aria-label="Efektler">
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Video, foto, canlı yayın seçimi */}
      <div className="mt-3 space-y-3 px-4 pb-2">
        <div className="flex items-center justify-center gap-2">
          {(
            [
              { id: "foto", label: "Foto", icon: Camera },
              { id: "video", label: "Video", icon: VideoIcon },
              { id: "canli", label: "Canlı Yayın", icon: Radio },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setRecording((r) => !r)}
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-card ring-2 transition-colors ${
              recording ? "bg-red-600 ring-red-600" : "bg-primary ring-primary"
            }`}
            aria-label={mode === "canli" ? "Yayını başlat/durdur" : "Kaydı başlat/durdur"}
          >
            <Circle
              className={`h-7 w-7 text-primary-foreground ${recording ? "fill-white" : "fill-primary-foreground"}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
