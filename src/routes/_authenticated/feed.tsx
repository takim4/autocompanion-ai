import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Heart,
  MessageCircle,
  Play,
  Plus,
  Radio,
  Search,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdSquare, AdVideoTile } from "@/components/ads/ad-slot";
import { LoadingState } from "@/components/data-state";
import { listFollowCandidates, toggleFollow } from "@/lib/forum.functions";
import { listReels, listStories, toggleSocialPostLike } from "@/lib/social.functions";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "Akış — AutoSocial" },
      {
        name: "description",
        content: "Otomobil severlerin hikayeleri, reels videoları ve canlı yayınları tek akışta.",
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

type ReelRow = {
  id: string;
  user_id: string | null;
  author_name: string;
  author_avatar: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  tag: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

type StoryRow = {
  id: string;
  user_id: string | null;
  author_name: string;
  author_avatar: string;
  media_url: string;
  media_type: "image" | "video";
};

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

function FeedPage() {
  const [tab, setTab] = useState<Tab>("reels");
  const [query, setQuery] = useState("");
  const [activeStory, setActiveStory] = useState<StoryRow | null>(null);
  const [seenStories, setSeenStories] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const reelsFn = useServerFn(listReels);
  const reelsQ = useQuery({ queryKey: ["reels"], queryFn: () => reelsFn() });
  const storiesFn = useServerFn(listStories);
  const storiesQ = useQuery({ queryKey: ["stories"], queryFn: () => storiesFn() });

  const candidatesFn = useServerFn(listFollowCandidates);
  const candidatesQ = useQuery({ queryKey: ["follow-candidates"], queryFn: () => candidatesFn() });
  const followFn = useServerFn(toggleFollow);
  const followMut = useMutation({
    mutationFn: (followee_id: string) => followFn({ data: { followee_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-candidates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const allReels = (reelsQ.data ?? []) as ReelRow[];
  const stories = (storiesQ.data ?? []) as StoryRow[];
  const candidates = candidatesQ.data ?? [];

  const q = query.trim().toLowerCase();
  const reels = useMemo(
    () =>
      !q
        ? allReels
        : allReels.filter(
            (r) =>
              r.author_name.toLowerCase().includes(q) ||
              (r.caption ?? "").toLowerCase().includes(q) ||
              (r.tag ?? "").toLowerCase().includes(q),
          ),
    [allReels, q],
  );

  const openStory = (s: StoryRow) => {
    setActiveStory(s);
    setSeenStories((prev) => new Set(prev).add(s.id));
  };

  return (
    <div className="-mx-4 -my-6">
      {/* Stories bar */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto pb-1">
          <Link
            to="/feed/create"
            search={{ as: "story" }}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-card">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Senin hikayen</span>
          </Link>
          {stories.map((s) => {
            const seen = seenStories.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => openStory(s)}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <div
                  className={`rounded-full p-[2px] ${
                    seen ? "bg-muted" : "bg-brand-gradient"
                  }`}
                >
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-card text-2xl">
                    {s.author_avatar?.startsWith("http") ? (
                      <img src={s.author_avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      s.author_avatar
                    )}
                  </div>
                </div>
                <span className="max-w-[64px] truncate text-[10px]">{s.author_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}

      {/* Arama (Search) */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Video, kullanıcı veya etiket ara…"
            className="w-full rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button asChild size="sm" variant="brand" className="shrink-0">
          <Link to="/feed/create">
            <Video className="mr-1.5 h-4 w-4" /> Video Oluştur
          </Link>
        </Button>
      </div>

      {/* Takip Edilenler — mobilde yatay şerit, md+ ekranda sağ panelde */}
      {candidates.length > 0 && (
        <div className="flex gap-3 overflow-x-auto border-b border-border px-4 py-3 md:hidden">
          {candidates.map((u) => (
            <button
              key={u.id}
              onClick={() => followMut.mutate(u.id)}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-lg ring-2 ${
                  u.is_following ? "bg-primary/15 ring-primary" : "bg-muted ring-transparent"
                }`}
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  "🙂"
                )}
              </span>
              <span className="max-w-[56px] truncate text-[10px] text-muted-foreground">
                {u.username ?? u.display_name ?? "kullanıcı"}
              </span>
            </button>
          ))}
        </div>
      )}

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

      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          {tab === "reels" && (
            <>
              {reelsQ.isLoading && <LoadingState label="Videolar yükleniyor…" />}
              <ReelsGrid reels={reels} />
              {query.trim() && reels.length === 0 && !reelsQ.isLoading && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  "{query}" için sonuç bulunamadı.
                </p>
              )}
            </>
          )}
          {tab === "stories" && (
            <>
              {storiesQ.isLoading && <LoadingState label="Hikayeler yükleniyor…" />}
              <StoriesGrid stories={stories} onOpen={openStory} seenStories={seenStories} />
            </>
          )}
          {tab === "live" && <LiveGrid />}
          {tab === "profiles" && (
            <ProfilesGrid candidates={candidates} onToggle={(id) => followMut.mutate(id)} />
          )}
        </div>

        {/* Takip Edilenler */}
        <aside className="hidden space-y-3 md:block">
          <div className="rounded-2xl border border-border bg-card p-3">
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Takip Edilenler
            </h3>
            {candidates.length === 0 && !candidatesQ.isLoading && (
              <p className="px-1 text-xs text-muted-foreground">
                Henüz takip edebileceğin başka kullanıcı yok.
              </p>
            )}
            <ul className="space-y-1">
              {candidates.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => followMut.mutate(u.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent/30"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-base ${
                        u.is_following ? "bg-primary/15" : "bg-muted"
                      }`}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "🙂"
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {u.username ?? u.display_name ?? "kullanıcı"}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-medium ${
                        u.is_following ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {u.is_following ? "Takipte" : "Takip Et"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <AdSquare />
        </aside>
      </div>
    </div>
  );
}

function StoryViewer({ story, onClose }: { story: StoryRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Kapat"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="flex aspect-[9/16] w-full max-w-xs flex-col items-center justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-center"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: `url(${story.media_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {story.user_id ? (
          <Link
            to="/u/$userId"
            params={{ userId: story.user_id }}
            onClick={(e) => e.stopPropagation()}
            className="text-lg font-semibold text-white drop-shadow hover:underline"
          >
            @{story.author_name}
          </Link>
        ) : (
          <p className="text-lg font-semibold text-white drop-shadow">@{story.author_name}</p>
        )}
      </div>
    </div>
  );
}

async function shareReel(r: { author_name: string; caption: string | null }) {
  const shareData = {
    title: `AutoSocial — ${r.author_name}`,
    text: r.caption ?? "",
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
    } catch {
      // kullanıcı paylaşımı iptal etti
    }
    return;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard && shareData.url) {
    await navigator.clipboard.writeText(shareData.url);
    toast.success("Bağlantı panoya kopyalandı.");
  }
}

function ReelsGrid({ reels }: { reels: ReelRow[] }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(toggleSocialPostLike);
  const mut = useMutation({
    mutationFn: (post_id: string) => toggleFn({ data: { post_id } }),
    onMutate: async (post_id) => {
      await qc.cancelQueries({ queryKey: ["reels"] });
      qc.setQueryData<ReelRow[]>(["reels"], (old) =>
        (old ?? []).map((r) =>
          r.id === post_id
            ? {
                ...r,
                liked_by_me: !r.liked_by_me,
                like_count: r.like_count + (r.liked_by_me ? -1 : 1),
              }
            : r,
        ),
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: ["reels"] }),
  });

  if (reels.length === 0) return null;

  const onLike = (id: string) => mut.mutate(id);

  return (
    <>
      {/* Telefon: aşağı kaydırarak gezinilen tam genişlikte akış (Reels/TikTok gibi) */}
      <div className="-mx-4 flex h-[75vh] snap-y snap-mandatory flex-col gap-3 overflow-y-auto px-4 md:hidden">
        {reels.map((r) => (
          <div key={r.id} className="snap-start">
            <ReelCard r={r} onLike={onLike} />
          </div>
        ))}
        <AdVideoTile />
      </div>

      {/* Tablet/masaüstü: klasik site grid'i, kaydırma yok */}
      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
        {reels.map((r) => (
          <ReelCard key={r.id} r={r} onLike={onLike} />
        ))}
        <AdVideoTile />
      </div>
    </>
  );
}

function ReelCard({ r, onLike }: { r: ReelRow; onLike: (id: string) => void }) {
  return (
    <div className="group relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
      {r.media_type === "video" ? (
        <video
          src={r.media_url}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          autoPlay
        />
      ) : (
        <img src={r.media_url} alt="" className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/0">
        <Play className="h-14 w-14 text-white/80 drop-shadow-lg transition group-hover:scale-110" />
      </div>
      {r.tag && (
        <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {r.tag}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        {r.user_id ? (
          <Link
            to="/u/$userId"
            params={{ userId: r.user_id }}
            className="relative z-10 text-xs font-semibold text-white hover:underline"
          >
            {r.author_name}
          </Link>
        ) : (
          <p className="text-xs font-semibold text-white">{r.author_name}</p>
        )}
        {r.caption && <p className="mt-0.5 line-clamp-2 text-[11px] text-white/90">{r.caption}</p>}
        <div className="mt-2 flex gap-3 text-[11px] text-white/90">
          <button
            onClick={() => onLike(r.id)}
            className={`flex items-center gap-1 ${r.liked_by_me ? "text-accent" : ""}`}
          >
            <Heart className={`h-3 w-3 ${r.liked_by_me ? "fill-current" : ""}`} />{" "}
            {formatK(r.like_count)}
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {r.comment_count}
          </span>
          <button onClick={() => shareReel(r)} className="ml-auto flex items-center gap-1">
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StoriesGrid({
  stories,
  onOpen,
  seenStories,
}: {
  stories: StoryRow[];
  onOpen: (s: StoryRow) => void;
  seenStories: Set<string>;
}) {
  if (stories.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Henüz hikaye yok.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stories.map((s) => {
        const seen = seenStories.has(s.id);
        return (
          <button
            key={s.id}
            onClick={() => onOpen(s)}
            className="relative flex aspect-[9/14] items-end overflow-hidden rounded-xl bg-cover bg-center p-3 text-left"
            style={{ backgroundImage: `url(${s.media_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="relative z-10">
              <p className="text-sm font-semibold text-white">@{s.author_name}</p>
              <p className="text-[10px] text-white/70">{seen ? "Görüldü" : "Yeni hikaye"}</p>
            </div>
          </button>
        );
      })}
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
            <Button
              size="sm"
              onClick={() => toast.info("Canlı yayın altyapısı henüz aktif değil — yakında!")}
              className="mt-3 h-7 bg-white text-black hover:bg-white/90"
            >
              Katıl
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfilesGrid({
  candidates,
  onToggle,
}: {
  candidates: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_following: boolean;
  }>;
  onToggle: (id: string) => void;
}) {
  if (candidates.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Henüz platformda takip edebileceğin başka kullanıcı yok.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <Link
            to="/u/$userId"
            params={{ userId: p.id }}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent text-2xl">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                "🙂"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {p.display_name ?? p.username ?? "Kullanıcı"}
              </p>
              {p.username && (
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              )}
            </div>
          </Link>
          <Button
            size="sm"
            variant={p.is_following ? "secondary" : "outline"}
            onClick={() => onToggle(p.id)}
            className="h-8 shrink-0"
          >
            {p.is_following ? "Takipte" : "Takip"}
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
