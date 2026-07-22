import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Play,
  Plus,
  Radio,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "Akış — AutoSocial" },
      {
        name: "description",
        content:
          "Otomobil severlerin hikayeleri, reels videoları ve canlı yayınları tek akışta.",
      },
      { property: "og:title", content: "AutoSocial Akış" },
      {
        property: "og:description",
        content: "Hikayeler, Reels ve canlı yayınlar.",
      },
    ],
  }),
});

type Tab = "reels" | "stories" | "live" | "profiles";

const STORIES = [
  { id: "1", user: "ahmet_gt", avatar: "🏎️", live: false, seen: false },
  { id: "2", user: "garaj42", avatar: "🔧", live: true, seen: false },
  { id: "3", user: "bmwlife", avatar: "🚗", live: false, seen: false },
  { id: "4", user: "dieselking", avatar: "⛽", live: false, seen: true },
  { id: "5", user: "elektrikci_ali", avatar: "⚡", live: false, seen: false },
  { id: "6", user: "usta_mehmet", avatar: "🛠️", live: true, seen: false },
  { id: "7", user: "drift_kral", avatar: "💨", live: false, seen: true },
  { id: "8", user: "motorsporu", avatar: "🏁", live: false, seen: false },
];

const REELS = [
  {
    id: "r1",
    user: "@drift_kral",
    caption: "M3 ile gece turu — Boğaz köprüsü 🌉",
    likes: 12400,
    comments: 342,
    bg: "from-orange-500 via-red-600 to-purple-900",
    tag: "Drift",
  },
  {
    id: "r2",
    user: "@usta_mehmet",
    caption: "Turbo değişimi nasıl yapılır — 60 saniyede özet 🔧",
    likes: 8900,
    comments: 512,
    bg: "from-slate-800 via-blue-900 to-cyan-700",
    tag: "Tamir",
  },
  {
    id: "r3",
    user: "@garaj42",
    caption: "E46 restorasyonu bitti! Öncesi/sonrası 😍",
    likes: 24100,
    comments: 891,
    bg: "from-emerald-700 via-teal-800 to-slate-900",
    tag: "Resto",
  },
  {
    id: "r4",
    user: "@elektrikci_ali",
    caption: "EV bakımı — 5 altın kural ⚡",
    likes: 5600,
    comments: 128,
    bg: "from-yellow-500 via-orange-700 to-rose-800",
    tag: "EV",
  },
];

const LIVE = [
  {
    id: "l1",
    user: "garaj42",
    title: "🔴 CANLI: Motor sesinden arıza teşhisi",
    viewers: 1243,
    bg: "from-red-600 to-slate-900",
  },
  {
    id: "l2",
    user: "usta_mehmet",
    title: "🔴 Fren balata değişimi — Soru cevap",
    viewers: 487,
    bg: "from-blue-700 to-black",
  },
  {
    id: "l3",
    user: "motorsporu",
    title: "🔴 F1 sıralama turları — Yorum",
    viewers: 3210,
    bg: "from-purple-700 to-red-900",
  },
];

const PROFILES = [
  { id: "p1", user: "ahmet_gt", name: "Ahmet Y.", followers: "12.4K", cars: 3, avatar: "🏎️" },
  { id: "p2", user: "garaj42", name: "Garaj 42", followers: "89K", cars: 12, avatar: "🔧" },
  { id: "p3", user: "bmwlife", name: "BMW Life TR", followers: "45.2K", cars: 5, avatar: "🚗" },
  { id: "p4", user: "elektrikci_ali", name: "Ali Elektrik", followers: "7.8K", cars: 2, avatar: "⚡" },
  { id: "p5", user: "usta_mehmet", name: "Usta Mehmet", followers: "22K", cars: 1, avatar: "🛠️" },
  { id: "p6", user: "drift_kral", name: "Drift Kral", followers: "156K", cars: 4, avatar: "💨" },
];

function FeedPage() {
  const [tab, setTab] = useState<Tab>("reels");

  return (
    <div className="-mx-4 -my-6">
      {/* Stories bar */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto pb-1">
          <button className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-card">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Senin hikayen</span>
          </button>
          {STORIES.map((s) => (
            <button key={s.id} className="flex shrink-0 flex-col items-center gap-1.5">
              <div
                className={`rounded-full p-[2px] ${
                  s.live
                    ? "bg-gradient-to-tr from-red-500 to-orange-500"
                    : s.seen
                    ? "bg-muted"
                    : "bg-gradient-to-tr from-primary via-accent to-primary"
                }`}
              >
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-background bg-card text-2xl">
                  {s.avatar}
                  {s.live && (
                    <span className="absolute -bottom-1 rounded-sm bg-red-600 px-1.5 text-[9px] font-bold text-white">
                      CANLI
                    </span>
                  )}
                </div>
              </div>
              <span className="max-w-[64px] truncate text-[10px]">{s.user}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex border-b border-border bg-background/95 backdrop-blur">
        {(
          [
            { id: "reels", label: "Reels", icon: Play },
            { id: "stories", label: "Hikayeler", icon: Sparkles },
            { id: "live", label: "Canlı", icon: Radio },
            { id: "profiles", label: "Profiller", icon: Heart },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                active
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {tab === "reels" && <ReelsGrid />}
        {tab === "stories" && <StoriesGrid />}
        {tab === "live" && <LiveGrid />}
        {tab === "profiles" && <ProfilesGrid />}
      </div>
    </div>
  );
}

function ReelsGrid() {
  const [muted, setMuted] = useState(true);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {REELS.map((r) => (
        <div
          key={r.id}
          className={`group relative aspect-[9/16] overflow-hidden rounded-xl bg-gradient-to-br ${r.bg}`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="h-14 w-14 text-white/80 drop-shadow-lg transition group-hover:scale-110" />
          </div>
          <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            {r.tag}
          </span>
          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-xs font-semibold text-white">{r.user}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-white/90">{r.caption}</p>
            <div className="mt-2 flex gap-3 text-[11px] text-white/90">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {formatK(r.likes)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> {r.comments}
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Send className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StoriesGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {STORIES.map((s) => (
        <div
          key={s.id}
          className="relative flex aspect-[9/14] items-end overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 p-3"
        >
          <div className="absolute right-2 top-2 text-4xl">{s.avatar}</div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-white">@{s.user}</p>
            {s.live ? (
              <span className="mt-1 inline-block rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                CANLI
              </span>
            ) : (
              <p className="text-[10px] text-white/70">
                {s.seen ? "Görüldü" : "Yeni hikaye"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LIVE.map((l) => (
        <div
          key={l.id}
          className={`relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br ${l.bg} p-4`}
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              CANLI
            </span>
            <span className="rounded bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur">
              👁 {l.viewers.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-xs text-white/80">@{l.user}</p>
            <p className="mt-1 text-sm font-semibold text-white">{l.title}</p>
            <Button size="sm" className="mt-3 h-7 bg-white text-black hover:bg-white/90">
              Katıl
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfilesGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PROFILES.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-2xl">
            {p.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold">{p.name}</p>
            <p className="truncate text-xs text-muted-foreground">@{p.user}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {p.followers} takipçi · {p.cars} araç
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8">
            Takip
          </Button>
        </div>
      ))}
    </div>
  );
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}
