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
      { property: "og:description", content: "Hikayeler, Reels ve canlı yayınlar." },
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
  { id: "l1", user: "garaj42", title: "CANLI: Motor sesinden arıza teşhisi", viewers: 1243 },
  { id: "l2", user: "usta_mehmet", title: "Fren balata değişimi — Soru cevap", viewers: 487 },
  { id: "l3", user: "motorsporu", title: "F1 sıralama turları — Yorum", viewers: 3210 },
];

const TABS = [
  { id: "reels", label: "Reels", icon: Play },
  { id: "stories", label: "Hikayeler", icon: Sparkles },
  { id: "live", label: "Canlı", icon: Radio },
  { id: "profiles", label: "Profiller", icon: Heart },
] as const;

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
      <div className="border-b border-border px-4 py-4">
        <div className="flex gap-4 overflow-x-auto pb-1">
          <Link to="/feed/create" search={{ as: "story" }} className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Senin hikayen</span>
          </Link>
          {stories.map((s) => {
            const seen = seenStories.has(s.id);
            return (
              <button key={s.id} onClick={() => openStory(s)} className="flex shrink-0 flex-col items-center gap-1.5">
                <div className={`rounded-full p-[2px] ${seen ? "" : "bg-brand-gradient"}`} style={seen ? { border: "1px solid var(--border)" } : undefined}>
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted text-2xl">
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

      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Video, kullanıcı veya etiket ara…"
            className="w-full border-b border-border bg-transparent py-1.5 pl-5 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>
        <Link
          to="/feed/create"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold"
        >
          <Video className="h-3.5 w-3.5" /> Video Oluştur
        </Link>
      </div>

      {candidates.length > 0 && (
        <div className="flex gap-3 overflow-x-auto border-b border-border px-4 py-3 md:hidden">
          {candidates.map((u) => (
            <button key={u.id} onClick={() => followMut.mutate(u.id)} className="flex shrink-0 flex-col items-center gap-1">
              <span
                className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border text-lg ${
                  u.is_following ? "border-foreground" : "border-border"
                }`}
              >
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : "🙂"}
              </span>
              <span className="max-w-[56px] truncate text-[10px] text-muted-foreground">
                {u.username ?? u.display_name ?? "kullanıcı"}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          {tab === "reels" && (
            <>
              {reelsQ.isLoading && <LoadingState label="Videolar yükleniyor…" />}
              <ReelsGrid reels={reels} />
              {query.trim() && reels.length === 0 && !reelsQ.isLoading && (
                <p className="py-10 text-center text-sm text-muted-foreground">"{query}" için sonuç bulunamadı.</p>
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
          {tab === "profiles" && <ProfilesGrid candidates={candidates} onToggle={(id) => followMut.mutate(id)} />}
        </div>

        <aside className="hidden space-y-6 md:block">
          <div>
            <h3 className="mb-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Takip Edilenler
            </h3>
            {candidates.length === 0 && !candidatesQ.isLoading && (
              <p className="text-xs text-muted-foreground">Henüz takip edebileceğin başka kullanıcı yok.</p>
            )}
            <ul className="space-y-3">
              {candidates.map((u) => (
                <li key={u.id}>
                  <button onClick={() => followMut.mutate(u.id)} className="flex w-full items-center gap-2.5 text-left text-sm">
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-base">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : "🙂"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{u.username ?? u.display_name ?? "kullanıcı"}</span>
                    <span className={`shrink-0 text-[11px] font-semibold ${u.is_following ? "text-foreground" : "text-muted-foreground"}`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Kapat"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="flex aspect-[9/16] w-full max-w-xs flex-col items-center justify-end rounded-2xl bg-cover bg-center p-6 text-center"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundImage: `url(${story.media_url})` }}
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
          r.id === post_id ? { ...r, liked_by_me: !r.liked_by_me, like_count: r.like_count + (r.liked_by_me ? -1 : 1) } : r,
        ),
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: ["reels"] }),
  });

  if (reels.length === 0) return null;
  const onLike = (id: string) => mut.mutate(id);

  return (
    <>
      <div className="-mx-4 flex h-[75vh] snap-y snap-mandatory flex-col gap-3 overflow-y-auto px-4 md:hidden">
        {reels.map((r) => (
          <div key={r.id} className="snap-start">
            <ReelCard r={r} onLike={onLike} />
          </div>
        ))}
        <AdVideoTile />
      </div>
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
        <video src={r.media_url} className="h-full w-full object-cover" muted loop playsInline autoPlay />
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
          <Link to="/u/$userId" params={{ userId: r.user_id }} className="relative z-10 text-xs font-semibold text-white hover:underline">
            {r.author_name}
          </Link>
        ) : (
          <p className="text-xs font-semibold text-white">{r.author_name}</p>
        )}
        {r.caption && <p className="mt-0.5 line-clamp-2 text-[11px] text-white/90">{r.caption}</p>}
        <div className="mt-2 flex gap-3 text-[11px] text-white/90">
          <button onClick={() => onLike(r.id)} className={`flex items-center gap-1 ${r.liked_by_me ? "text-white" : ""}`}>
            <Heart className={`h-3 w-3 ${r.liked_by_me ? "fill-current" : ""}`} /> {formatK(r.like_count)}
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
    <div className="divide-y divide-border">
      {LIVE.map((l) => (
        <div key={l.id} className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
            <div>
              <p className="text-sm font-semibold">{l.title}</p>
              <p className="text-xs text-muted-foreground">
                @{l.user} · {l.viewers.toLocaleString("tr-TR")} izleyici
              </p>
            </div>
          </div>
          <button
            onClick={() => toast.info("Canlı yayın altyapısı henüz aktif değil — yakında!")}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-foreground"
          >
            Katıl
          </button>
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
    return <p className="py-10 text-center text-sm text-muted-foreground">Henüz platformda takip edebileceğin başka kullanıcı yok.</p>;
  }
  return (
    <div className="divide-y divide-border">
      {candidates.map((p) => (
        <div key={p.id} className="flex items-center gap-3 py-3.5">
          <Link to="/u/$userId" params={{ userId: p.id }} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xl">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : "🙂"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.display_name ?? p.username ?? "Kullanıcı"}</p>
              {p.username && <p className="truncate text-xs text-muted-foreground">@{p.username}</p>}
            </div>
          </Link>
          <button
            onClick={() => onToggle(p.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
              p.is_following ? "border-foreground" : "border-border hover:border-foreground"
            }`}
          >
            {p.is_following ? "Takipte" : "Takip"}
          </button>
        </div>
      ))}
    </div>
  );
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}
