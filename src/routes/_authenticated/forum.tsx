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
  const [featured, ...rest] = posts;

  return (
    <div className="-mx-4 -my-6 grid gap-x-10 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0">
        <header className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sayı 01</p>
            <h1 className="font-display text-3xl font-medium tracking-tight">Topluluk Forumu</h1>
          </div>
          <div className="relative hidden w-56 sm:block">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara…"
              className="w-full border-b border-border bg-transparent py-1.5 pl-5 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
          </div>
        </header>

        <div className="sm:hidden mb-5 relative">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Forumda ara…"
            className="w-full border-b border-border bg-transparent py-2 pl-5 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>

        {candidates.length > 0 && (
          <div className="-mb-1 mb-5 flex gap-4 overflow-x-auto pb-1 md:hidden">
            {candidates.map((u) => (
              <Link
                key={u.id}
                to="/u/$userId"
                params={{ userId: u.id }}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border text-lg ${
                    u.is_following ? "border-foreground" : "border-border"
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

        <section className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TREND_TOPICS.map((t) => (
              <button
                key={t.tag}
                onClick={() => setQuery(t.tag)}
                className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                #{t.tag} <span className="text-muted-foreground/70">· {t.count}</span>
              </button>
            ))}
          </div>
        </section>

        <ComposePost />

        <div className="my-6">
          <AdBanner />
        </div>

        {postsQ.isLoading && <LoadingState label="Gönderiler yükleniyor…" />}
        {postsQ.isError && (
          <p className="py-6 text-center text-sm text-destructive">
            {postsQ.error instanceof Error ? postsQ.error.message : "Gönderiler yüklenemedi."}
          </p>
        )}

        {featured && !query.trim() && (
          <FeaturedPostCard post={featured} />
        )}

        <section className="mt-2 divide-y divide-border">
          {(query.trim() ? posts : rest).map((post, i) => (
            <Fragment key={post.id}>
              <ForumPostRowItem post={post} />
              {i === 1 && (
                <div className="py-5">
                  <NativeAdCard />
                </div>
              )}
            </Fragment>
          ))}
        </section>

        {postsQ.data && posts.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {query ? `"${query}" için sonuç bulunamadı.` : "Henüz gönderi yok — ilkini sen paylaş."}
          </p>
        )}
      </div>

      <aside className="hidden space-y-6 md:block">
        <div>
          <h3 className="mb-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Takip Edilenler
          </h3>
          {candidatesQ.isLoading && (
            <p className="text-xs text-muted-foreground">Yükleniyor…</p>
          )}
          {candidates.length === 0 && !candidatesQ.isLoading && (
            <p className="text-xs text-muted-foreground">
              Henüz takip edebileceğin başka kullanıcı yok.
            </p>
          )}
          <ul className="space-y-3">
            {candidates.map((u) => (
              <li key={u.id} className="flex items-center gap-2.5">
                <Link
                  to="/u/$userId"
                  params={{ userId: u.id }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-base">
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
                  className={`shrink-0 text-[11px] font-semibold ${
                    u.is_following ? "text-foreground" : "text-muted-foreground hover:text-foreground"
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
    <section className="border-y border-border py-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-base">
          🙂
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Bir soru sor ya da deneyimini paylaş…"
            className="w-full resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />

          {preview && (
            <div className="relative mt-2 inline-block">
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

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={attach("photo")} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={attach("video")} />
              <button
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <ImagePlus className="h-3.5 w-3.5" /> Fotoğraf
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Camera className="h-3.5 w-3.5" /> Video
              </button>
            </div>
            <button
              onClick={() => mut.mutate()}
              disabled={!text.trim() || mut.isPending}
              className="flex items-center gap-1.5 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Paylaş
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedPostCard({ post }: { post: ForumPostRow }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate({ to: "/forum/$postId", params: { postId: post.id } })}
      className="group mt-6 block w-full text-left"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Öne çıkan</p>
      {post.media_url && post.media_type === "image" && (
        <div className="mb-4 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted">
          <img
            src={post.media_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <h2 className="font-display text-2xl font-medium leading-snug tracking-tight group-hover:underline">
        {post.title}
      </h2>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <AuthorAvatar avatar={post.author_avatar} small />
        <span>{post.author_name}</span>
        <span>·</span>
        <span>{new Date(post.created_at).toLocaleDateString("tr-TR")}</span>
        <span className="ml-auto flex items-center gap-1">
          <Heart className={`h-3.5 w-3.5 ${post.liked_by_me ? "fill-current text-foreground" : ""}`} /> {post.like_count}
        </span>
      </div>
    </button>
  );
}

function ForumPostRowItem({ post }: { post: ForumPostRow }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(toggleForumPostLike);
  const mut = useMutation({
    mutationFn: () => toggleFn({ data: { post_id: post.id } }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["forum-posts"] });
      qc.setQueryData<ForumPostRow[]>(["forum-posts"], (old) =>
        (old ?? []).map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
            : p,
        ),
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: ["forum-posts"] }),
  });

  const navigate = useNavigate();

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => navigate({ to: "/forum/$postId", params: { postId: post.id } })}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate({ to: "/forum/$postId", params: { postId: post.id } });
      }}
      className="group flex cursor-pointer gap-4 py-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AuthorAvatar avatar={post.author_avatar} small />
          <span className="font-medium text-foreground">{post.author_name}</span>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleDateString("tr-TR")}</span>
        </div>
        <h3 className="mt-1.5 font-display text-lg font-medium leading-snug tracking-tight group-hover:underline">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
            {post.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mut.mutate();
            }}
            className={`flex items-center gap-1 ${post.liked_by_me ? "text-foreground" : "hover:text-foreground"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${post.liked_by_me ? "fill-current" : ""}`} /> {post.like_count}
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {post.comment_count}
          </span>
        </div>
      </div>
      {post.media_url && post.media_type === "image" && (
        <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
          <img src={post.media_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </article>
  );
}

function AuthorAvatar({ avatar, small }: { avatar: string; small?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ${
        small ? "h-5 w-5 text-xs" : "h-8 w-8 text-base"
      }`}
    >
      {avatar?.startsWith("http") ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : avatar}
    </span>
  );
}
