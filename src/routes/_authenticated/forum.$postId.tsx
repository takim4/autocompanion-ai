import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Heart, Loader2, Send } from "lucide-react";
import { AdBanner } from "@/components/ads/ad-slot";
import { EmptyState, LoadingState } from "@/components/data-state";
import {
  createForumComment,
  getForumPost,
  toggleForumCommentLike,
  toggleForumPostLike,
} from "@/lib/forum.functions";

export const Route = createFileRoute("/_authenticated/forum/$postId")({
  component: ForumPostPage,
  head: () => ({ meta: [{ title: "Gönderi — AutoSocial" }] }),
});

function ForumPostPage() {
  const { postId } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getForumPost);
  const postQ = useQuery({
    queryKey: ["forum-post", postId],
    queryFn: () => getFn({ data: { id: postId } }),
  });

  const likeFn = useServerFn(toggleForumPostLike);
  const likeMut = useMutation({
    mutationFn: () => likeFn({ data: { post_id: postId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-post", postId] }),
  });

  const [comment, setComment] = useState("");
  const commentFn = useServerFn(createForumComment);
  const commentMut = useMutation({
    mutationFn: (content: string) => commentFn({ data: { post_id: postId, content } }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["forum-post", postId] });
    },
  });

  const commentLikeFn = useServerFn(toggleForumCommentLike);
  const commentLikeMut = useMutation({
    mutationFn: (comment_id: string) => commentLikeFn({ data: { comment_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-post", postId] }),
  });

  if (postQ.isLoading) return <LoadingState label="Gönderi yükleniyor…" />;

  const post = postQ.data;
  if (!post) {
    return (
      <EmptyState
        title="Gönderi bulunamadı"
        description="Bu gönderi kaldırılmış olabilir."
        action={
          <Link to="/forum" className="text-sm font-medium underline">
            Foruma dön
          </Link>
        }
      />
    );
  }

  return (
    <article className="mx-auto max-w-2xl">
      <Link
        to="/forum"
        className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Foruma dön
      </Link>

      <header>
        {post.tags?.length > 0 && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {post.tags.map((t: string) => `#${t}`).join("  ")}
          </p>
        )}
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4">
          <PostAuthor userId={post.user_id} name={post.author_name} avatar={post.author_avatar}>
            <p className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleString("tr-TR")}
            </p>
          </PostAuthor>
        </div>
      </header>

      {post.media_url && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-muted">
          {post.media_type === "video" ? (
            <video src={post.media_url} controls className="w-full" />
          ) : (
            <img src={post.media_url} alt="" className="w-full object-cover" />
          )}
        </div>
      )}

      <div className="mt-6 border-t border-border pt-6">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{post.body}</p>
        <div className="mt-6 flex items-center gap-5 border-t border-border pt-4 text-sm text-muted-foreground">
          <button
            onClick={() => likeMut.mutate()}
            disabled={likeMut.isPending}
            className={`flex items-center gap-1.5 ${post.liked_by_me ? "text-foreground" : "hover:text-foreground"}`}
          >
            <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
            {post.like_count}
          </button>
          <span className="flex items-center gap-1.5">{post.comments.length} yorum</span>
        </div>
      </div>

      <div className="my-8">
        <AdBanner
          title="Sigortanı AutoSocial üzerinden yenile"
          description="Anlaşmalı sigorta ortaklarından saniyeler içinde teklif al."
          cta="Teklif Al"
        />
      </div>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Yorumlar ({post.comments.length})
        </h2>
        <div className="divide-y divide-border">
          {post.comments.map(
            (c: {
              id: string;
              user_id: string | null;
              author_name: string;
              author_avatar: string;
              content: string;
              created_at: string;
              like_count: number;
              liked_by_me: boolean;
            }) => (
              <div key={c.id} className="flex gap-3 py-3">
                {c.user_id ? (
                  <Link to="/u/$userId" params={{ userId: c.user_id }} className="shrink-0">
                    <CommentAvatar avatar={c.author_avatar} />
                  </Link>
                ) : (
                  <CommentAvatar avatar={c.author_avatar} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {c.user_id ? (
                      <Link to="/u/$userId" params={{ userId: c.user_id }} className="text-xs font-semibold hover:underline">
                        {c.author_name}
                      </Link>
                    ) : (
                      <p className="text-xs font-semibold">{c.author_name}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm">{c.content}</p>
                  <button
                    onClick={() => commentLikeMut.mutate(c.id)}
                    className={`mt-1 flex items-center gap-1 text-[11px] hover:text-foreground ${
                      c.liked_by_me ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Heart className={`h-3 w-3 ${c.liked_by_me ? "fill-current" : ""}`} /> {c.like_count}
                  </button>
                </div>
              </div>
            ),
          )}
          {post.comments.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">İlk yorumu sen yaz.</p>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!comment.trim() || commentMut.isPending) return;
            commentMut.mutate(comment.trim());
          }}
          className="mt-4 flex items-center gap-2 border-t border-border pt-4"
        >
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Yorum yaz…"
            className="flex-1 border-b border-border bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
          />
          <button
            type="submit"
            disabled={!comment.trim() || commentMut.isPending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient disabled:opacity-50"
            aria-label="Gönder"
          >
            {commentMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </section>
    </article>
  );
}

function PostAuthor({
  userId,
  name,
  avatar,
  children,
}: {
  userId: string | null;
  name: string;
  avatar: string;
  children?: React.ReactNode;
}) {
  const avatarEl = (
    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-base">
      {avatar?.startsWith("http") ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : avatar}
    </span>
  );
  if (!userId) {
    return (
      <div className="flex items-center gap-2">
        {avatarEl}
        <div>
          <p className="text-sm font-semibold">{name}</p>
          {children}
        </div>
      </div>
    );
  }
  return (
    <Link to="/u/$userId" params={{ userId }} className="flex items-center gap-2 hover:underline">
      {avatarEl}
      <div>
        <p className="text-sm font-semibold">{name}</p>
        {children}
      </div>
    </Link>
  );
}

function CommentAvatar({ avatar }: { avatar: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm">
      {avatar?.startsWith("http") ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : avatar}
    </span>
  );
}
