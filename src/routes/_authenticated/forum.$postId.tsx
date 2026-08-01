import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Heart, Send } from "lucide-react";
import { AdBanner } from "@/components/ads/ad-slot";
import { EmptyState } from "@/components/data-state";
import { FORUM_POSTS } from "@/lib/forum-data";
import { isImageSrc, useForumStore } from "@/stores/forum-store";

export const Route = createFileRoute("/_authenticated/forum/$postId")({
  component: ForumPostPage,
  head: ({ params }) => ({
    meta: [{ title: `${FORUM_POSTS.find((p) => p.id === params.postId)?.title ?? "Gönderi"} — AutoSocial` }],
  }),
});

function ForumPostPage() {
  const { postId } = Route.useParams();
  const post = useForumStore((s) => s.posts.find((p) => p.id === postId));
  const likedPostIds = useForumStore((s) => s.likedPostIds);
  const likedCommentIds = useForumStore((s) => s.likedCommentIds);
  const toggleLike = useForumStore((s) => s.toggleLike);
  const toggleCommentLike = useForumStore((s) => s.toggleCommentLike);
  const addComment = useForumStore((s) => s.addComment);
  const [comment, setComment] = useState("");

  if (!post) {
    return (
      <EmptyState
        title="Gönderi bulunamadı"
        description="Bu gönderi kaldırılmış olabilir."
        action={
          <Link to="/forum" className="text-sm font-medium text-primary hover:underline">
            Foruma dön
          </Link>
        }
      />
    );
  }

  const liked = likedPostIds.includes(post.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Foruma dön
      </Link>

      {/* Başlık, etiketler */}
      <header className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          {isImageSrc(post.avatar) ? (
            <img src={post.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-base">
              {post.avatar}
            </span>
          )}
          <div>
            <p className="text-sm font-semibold">{post.author}</p>
            <p className="text-[11px] text-muted-foreground">{post.time}</p>
          </div>
        </div>
        <h1 className="mt-3 text-xl font-bold">{post.title}</h1>
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
      </header>

      {/* Gönderi + foto */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-card to-accent/10 text-6xl">
          {isImageSrc(post.image) ? (
            <img src={post.image} alt="" className="h-full w-full object-cover" />
          ) : (
            post.image
          )}
        </div>
        <div className="p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-sm text-muted-foreground">
            <button
              onClick={() => toggleLike(post.id)}
              className={`flex items-center gap-1.5 ${liked ? "text-accent" : ""}`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {post.likes}
            </button>
            <span className="flex items-center gap-1.5">
              {post.comments.length} yorum
            </span>
          </div>
        </div>
      </section>

      <AdBanner
        title="Sigortanı AutoSocial üzerinden yenile"
        description="Anlaşmalı sigorta ortaklarından saniyeler içinde teklif al."
        cta="Teklif Al"
      />

      {/* Yorum, beğen */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Yorumlar ({post.comments.length})</h2>
        <div className="space-y-3">
          {post.comments.map((c) => {
            const commentLiked = likedCommentIds.includes(c.id);
            return (
              <div key={c.id} className="flex gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                  {c.avatar}
                </span>
                <div className="min-w-0 flex-1 rounded-xl bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">{c.author}</p>
                    <p className="text-[10px] text-muted-foreground">{c.time}</p>
                  </div>
                  <p className="mt-0.5 text-sm">{c.content}</p>
                  <button
                    onClick={() => toggleCommentLike(post.id, c.id)}
                    className={`mt-1 flex items-center gap-1 text-[11px] hover:text-accent ${
                      commentLiked ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    <Heart className={`h-3 w-3 ${commentLiked ? "fill-current" : ""}`} /> {c.likes}
                  </button>
                </div>
              </div>
            );
          })}
          {post.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">İlk yorumu sen yaz.</p>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!comment.trim()) return;
            addComment(post.id, comment);
            setComment("");
          }}
          className="mt-4 flex items-center gap-2 border-t border-border pt-3"
        >
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Yorum yaz…"
            className="flex-1 rounded-full border border-input bg-background px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!comment.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Gönder"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
