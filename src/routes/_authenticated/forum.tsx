import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
  Camera,
  Heart,
  ImagePlus,
  MessageCircle,
  Search,
  Send,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { AdBanner, AdSquare, NativeAdCard } from "@/components/ads/ad-slot";
import { FOLLOWED_USERS, FORUM_POSTS, TREND_TOPICS } from "@/lib/forum-data";

export const Route = createFileRoute("/_authenticated/forum")({
  component: ForumPage,
  head: () => ({ meta: [{ title: "Forum — AutoSocial" }] }),
});

function ForumPage() {
  const [query, setQuery] = useState("");

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FORUM_POSTS;
    return FORUM_POSTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className="-mx-4 -my-6 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0 space-y-4">
        {/* Arama (Search) */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Forumda ara — konu, etiket, marka…"
            className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Takip Edilenler — mobilde yatay şerit, md+ ekranda sağ panelde */}
        <div className="-mb-1 flex gap-3 overflow-x-auto pb-1 md:hidden">
          {FOLLOWED_USERS.map((u) => (
            <button key={u.id} className="flex shrink-0 flex-col items-center gap-1">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-lg">
                {u.avatar}
              </span>
              <span className="max-w-[56px] truncate text-[10px] text-muted-foreground">
                {u.user}
              </span>
            </button>
          ))}
        </div>

        {/* Popüler / Trend Konular */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Popüler / Trend Konular
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TREND_TOPICS.map((t) => (
              <button
                key={t.tag}
                onClick={() => setQuery(t.tag)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
              >
                #{t.tag} <span className="text-muted-foreground">· {t.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Gönderi Oluşturma Sekmesi */}
        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserPlus className="h-4 w-4" />
            </div>
            <input
              placeholder="Bir soru sor ya da deneyimini paylaş…"
              className="flex-1 rounded-full border border-input bg-background px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-2 flex gap-2 pl-11 text-xs text-muted-foreground">
            <button className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent/30 hover:text-foreground">
              <ImagePlus className="h-3.5 w-3.5" /> Fotoğraf
            </button>
            <button className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent/30 hover:text-foreground">
              <Camera className="h-3.5 w-3.5" /> Video
            </button>
          </div>
        </section>

        <AdBanner />

        {/* Forum Kısmı */}
        <section className="space-y-3">
          {posts.map((post, i) => (
            <Fragment key={post.id}>
              <ForumPostCard post={post} />
              {i === 1 && <NativeAdCard />}
            </Fragment>
          ))}
          {posts.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              "{query}" için sonuç bulunamadı.
            </p>
          )}
        </section>
      </div>

      {/* Takip Edilenler */}
      <aside className="hidden space-y-3 md:block">
        <div className="rounded-2xl border border-border bg-card p-3">
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Takip Edilenler
          </h3>
          <ul className="space-y-1">
            {FOLLOWED_USERS.map((u) => (
              <li key={u.id}>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent/30">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-base">
                    {u.avatar}
                  </span>
                  <span className="truncate">{u.user}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <AdSquare />
      </aside>
    </div>
  );
}

function ForumPostCard({ post }: { post: (typeof FORUM_POSTS)[number] }) {
  return (
    <Link
      to="/forum/$postId"
      params={{ postId: post.id }}
      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/60"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-base">
          {post.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{post.author}</p>
          <p className="text-[11px] text-muted-foreground">{post.time}</p>
        </div>
      </div>
      <h3 className="mt-3 text-base font-semibold">{post.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {post.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            #{t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" /> {post.likes}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Send className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
