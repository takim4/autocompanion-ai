import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  Search,
  Send,
  TrendingUp,
  X,
} from "lucide-react";
import { AdBanner, AdSquare, NativeAdCard } from "@/components/ads/ad-slot";
import { LoadingState } from "@/components/data-state";
import { TREND_TOPICS } from "@/lib/forum-data";
import {
  createForumComment,
  createForumPost,
  listForumPosts,
  listFollowCandidates,
  toggleFollow,
  toggleForumPostLike,
} from "@/lib/forum.functions";
import { uploadUserMedia } from "@/lib/media-upload";

export const Route = createFileRoute("/_authenticated/forum")({
  component: ForumPage,
  head: () => ({ meta: [{ title: "Forum — AutoSocial" }] }),
});

type ForumPostRow = {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  tags: string[];
  author_name: string;
  author_avatar: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
};

function ForumPage() {
  const [query, setQuery] = useState("");
  const qc = useQueryClient();

  const listFn = useServerFn(listForumPosts);
  const postsQ = useQuery({ queryKey: ["forum-posts"], queryFn: () => listFn() });

  const candidatesFn = useServerFn(listFollowCandidates);
  const candidatesQ = useQuery({ queryKey: ["follow-candidates"], queryFn: () => candidatesFn() });

  const followFn = useServerFn(toggleFollow);
  const followMut = useMutation({
    mutationFn: (followee_id: string) => followFn({ data: { followee_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-candidates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const allPosts = (postsQ.data ?? []) as ForumPostRow[];
  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPosts;
    return allPosts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [allPosts, query]);

  const candidates = candidatesQ.data ?? [];

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
        {candidates.length > 0 && (
          <div className="-mb-1 flex gap-3 overflow-x-auto pb-1 md:hidden">
            {candidates.map((u) => (
              <Link
                key={u.id}
                to="/u/$userId"
                params={{ userId: u.id }}
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
              </Link>
            ))}
          </div>
        )}

        {/* Popüler / Trend Konular */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-accent" /> Popüler / Trend Konular
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

        <ComposePost />

        <AdBanner />

        {/* Forum Kısmı */}
        <section className="space-y-3">
          {postsQ.isLoading && <LoadingState label="Gönderiler yükleniyor…" />}
          {postsQ.isError && (
            <p className="py-6 text-center text-sm text-destructive">
              {postsQ.error instanceof Error ? postsQ.error.message : "Gönderiler yüklenemedi."}
            </p>
          )}
          {posts.map((post, i) => (
            <Fragment key={post.id}>
              <ForumPostCard post={post} />
              {i === 1 && <NativeAdCard />}
            </Fragment>
          ))}
          {postsQ.data && posts.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {query
                ? `"${query}" için sonuç bulunamadı.`
                : "Henüz gönderi yok — ilkini sen paylaş."}
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
          {candidatesQ.isLoading && (
            <p className="px-1 text-xs text-muted-foreground">Yükleniyor…</p>
          )}
          {candidates.length === 0 && !candidatesQ.isLoading && (
            <p className="px-1 text-xs text-muted-foreground">
              Henüz takip edebileceğin başka kullanıcı yok.
            </p>
          )}
          <ul className="space-y-1">
            {candidates.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/30"
              >
                <Link
                  to="/u/$userId"
                  params={{ userId: u.id }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-base ${
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
                </Link>
                <button
                  onClick={() => followMut.mutate(u.id)}
                  className={`shrink-0 text-[11px] font-medium ${
                    u.is_following ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u.is_following ? "Takipte" : "Takip Et"}
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

function ComposePost() {
  const qc = useQueryClient();
  const createFn = useServerFn(createForumPost);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileKind, setFileKind] = useState<"photo" | "video" | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: async () => {
      let media_url: string | undefined;
      let media_type: "image" | "video" | undefined;
      if (file) {
        const uploaded = await uploadUserMedia(file, "forum");
        media_url = uploaded.url;
        media_type = uploaded.type;
      }
      return createFn({
        data: { title: text.trim(), body: text.trim(), tags: [], media_url, media_type },
      });
    },
    onSuccess: () => {
      toast.success("Gönderin foruma eklendi.");
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      setText("");
      clearAttachment();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAttachment = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setFileKind(null);
  };

  const attach = (kind: "photo" | "video") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setFileKind(kind);
    e.target.value = "";
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          🙂
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !mut.isPending) {
              e.preventDefault();
              if (text.trim()) mut.mutate();
            }
          }}
          placeholder="Bir soru sor ya da deneyimini paylaş…"
          className="flex-1 rounded-full border border-input bg-background px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={!text.trim() || mut.isPending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-[0_6px_16px_-6px_hsl(var(--shadow-color)/0.6)] disabled:opacity-40"
          aria-label="Paylaş"
        >
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {preview && (
        <div className="relative ml-11 mt-2 inline-block">
          {fileKind === "video" ? (
            <video src={preview} className="h-24 rounded-lg" muted controls />
          ) : (
            <img src={preview} alt="Ek" className="h-24 rounded-lg object-cover" />
          )}
          <button
            onClick={clearAttachment}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
            aria-label="Eki kaldır"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="mt-2 flex gap-2 pl-11 text-xs text-muted-foreground">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={attach("photo")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={attach("video")}
        />
        <button
          onClick={() => photoInputRef.current?.click()}
          className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent/30 hover:text-foreground"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Fotoğraf
        </button>
        <button
          onClick={() => videoInputRef.current?.click()}
          className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent/30 hover:text-foreground"
        >
          <Camera className="h-3.5 w-3.5" /> Video
        </button>
      </div>
    </section>
  );
}

function ForumPostCard({ post }: { post: ForumPostRow }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(toggleForumPostLike);
  const mut = useMutation({
    mutationFn: () => toggleFn({ data: { post_id: post.id } }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["forum-posts"] });
      qc.setQueryData<ForumPostRow[]>(["forum-posts"], (old) =>
        (old ?? []).map((p) =>
          p.id === post.id
            ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                like_count: p.like_count + (p.liked_by_me ? -1 : 1),
              }
            : p,
        ),
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: ["forum-posts"] }),
  });

  const navigate = useNavigate();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate({ to: "/forum/$postId", params: { postId: post.id } })}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate({ to: "/forum/$postId", params: { postId: post.id } });
      }}
      className="card-interactive cursor-pointer rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2">
        {post.user_id ? (
          <Link
            to="/u/$userId"
            params={{ userId: post.user_id }}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
          >
            <AuthorAvatar avatar={post.author_avatar} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{post.author_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString("tr-TR")}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <AuthorAvatar avatar={post.author_avatar} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{post.author_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString("tr-TR")}
              </p>
            </div>
          </div>
        )}
      </div>
      <h3 className="mt-3 text-base font-semibold">{post.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
      {post.media_url && post.media_type === "image" && (
        <img src={post.media_url} alt="" className="mt-2 max-h-56 w-full rounded-lg object-cover" />
      )}
      {post.tags.length > 0 && (
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
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            mut.mutate();
          }}
          className={`flex items-center gap-1 ${post.liked_by_me ? "text-accent" : ""}`}
        >
          <Heart className={`h-3.5 w-3.5 ${post.liked_by_me ? "fill-current" : ""}`} />{" "}
          {post.like_count}
        </button>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> {post.comment_count}
        </span>
      </div>
    </div>
  );
}

function AuthorAvatar({ avatar }: { avatar: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-base">
      {avatar?.startsWith("http") ? (
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        avatar
      )}
    </span>
  );
}
