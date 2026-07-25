import { useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Heart, Loader2, MessageCircle, Send, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReportDialog } from "@/components/report-dialog";
import {
  addComment,
  deletePost,
  listComments,
  toggleLike,
  toggleSave,
} from "@/lib/social.functions";
import { useAuth } from "@/hooks/use-auth";

export type FeedPost = {
  id: string;
  user_id: string;
  type: "text" | "image" | "video" | "live";
  caption: string | null;
  media_urls: string[];
  tag: string | null;
  live_title: string | null;
  live_ended_at: string | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  created_at: string;
  liked_by_me: boolean;
  saved_by_me: boolean;
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function PostCard({ post, queryKey }: { post: FeedPost; queryKey: QueryKey }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const likeFn = useServerFn(toggleLike);
  const saveFn = useServerFn(toggleSave);
  const deleteFn = useServerFn(deletePost);

  const likeMut = useMutation({
    mutationFn: () => likeFn({ data: { target_type: "post", target_id: post.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });
  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { target_type: "post", target_id: post.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: post.id } }),
    onSuccess: () => {
      toast.success("Gönderi silindi.");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const author = post.profile;
  const isOwn = user?.id === post.user_id;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 p-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author?.avatar_url ?? undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{author?.display_name ?? "Kullanıcı"}</p>
          {author?.username && (
            <p className="truncate text-xs text-muted-foreground">@{author.username}</p>
          )}
        </div>
        {post.tag && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
            {post.tag}
          </span>
        )}
      </div>

      {post.media_urls.length > 0 && (
        <div className="bg-black">
          {post.type === "video" ? (
            <video src={post.media_urls[0]} controls className="max-h-96 w-full" />
          ) : (
            <img
              src={post.media_urls[0]}
              alt={post.caption ?? ""}
              className="max-h-96 w-full object-contain"
            />
          )}
        </div>
      )}

      {post.caption && <p className="px-3 pt-2 text-sm">{post.caption}</p>}

      <div className="flex items-center gap-4 px-3 py-2.5 text-xs text-muted-foreground">
        <button
          onClick={() => likeMut.mutate()}
          disabled={likeMut.isPending}
          className={`flex items-center gap-1 ${post.liked_by_me ? "text-red-500" : "hover:text-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-red-500" : ""}`} />
          {formatK(post.like_count)}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {formatK(post.comment_count)}
        </button>
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className={`flex items-center gap-1 ${post.saved_by_me ? "text-primary" : "hover:text-foreground"}`}
        >
          <Bookmark className={`h-4 w-4 ${post.saved_by_me ? "fill-primary" : ""}`} />
          {formatK(post.save_count)}
        </button>
        <div className="ml-auto flex items-center gap-3">
          {isOwn ? (
            <button
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
              className="flex items-center gap-1 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ReportDialog
              targetType="post"
              targetId={post.id}
              trigger={<button className="hover:text-destructive">Şikayet</button>}
            />
          )}
        </div>
      </div>

      {showComments && <CommentsSection targetType="post" targetId={post.id} queryKey={queryKey} />}
    </div>
  );
}

function CommentsSection({
  targetType,
  targetId,
  queryKey,
}: {
  targetType: "post" | "forum_thread";
  targetId: string;
  queryKey: QueryKey;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listComments);
  const addFn = useServerFn(addComment);
  const [body, setBody] = useState("");
  const commentsKey = ["comments", targetType, targetId];
  const q = useQuery({
    queryKey: commentsKey,
    queryFn: () => listFn({ data: { target_type: targetType, target_id: targetId } }),
  });

  const mut = useMutation({
    mutationFn: () => addFn({ data: { target_type: targetType, target_id: targetId, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: commentsKey });
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="border-t border-border bg-muted/20 p-3">
      {q.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor…
        </div>
      )}
      <ul className="space-y-2">
        {(q.data ?? []).map((c) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cc = c as any;
          const profile = cc.profile as {
            display_name: string | null;
            username: string | null;
          } | null;
          return (
            <li key={cc.id} className="text-xs">
              <span className="font-semibold">{profile?.display_name ?? "Kullanıcı"}</span>{" "}
              <span className="text-foreground/90">{cc.body}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Yorum yaz…"
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && body.trim()) mut.mutate();
          }}
        />
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || body.trim().length === 0}
          className="rounded-md bg-primary p-1.5 text-primary-foreground disabled:opacity-50"
        >
          {mut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export { CommentsSection };
