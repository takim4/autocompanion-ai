import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Award,
  Bookmark,
  CheckCircle2,
  Heart,
  Loader2,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState, LoadingState } from "@/components/data-state";
import { ReportDialog } from "@/components/report-dialog";
import {
  createForumReply,
  deleteForumReply,
  deleteForumThread,
  getForumThread,
  markReplySolution,
} from "@/lib/forum.functions";
import { toggleLike, toggleSave } from "@/lib/social.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/forum/$threadId")({
  component: ThreadDetailPage,
  head: () => ({ meta: [{ title: "Konu — AutoSocial" }] }),
});

function ThreadDetailPage() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fn = useServerFn(getForumThread);
  const q = useQuery({
    queryKey: ["forum-thread", threadId],
    queryFn: () => fn({ data: { id: threadId } }),
  });

  const likeFn = useServerFn(toggleLike);
  const saveFn = useServerFn(toggleSave);
  const deleteThreadFn = useServerFn(deleteForumThread);

  const likeMut = useMutation({
    mutationFn: () => likeFn({ data: { target_type: "forum_thread", target_id: threadId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-thread", threadId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { target_type: "forum_thread", target_id: threadId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-thread", threadId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteThreadFn({ data: { id: threadId } }),
    onSuccess: () => {
      toast.success("Konu silindi.");
      window.history.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <LoadingState />;
  if (!q.data) return <EmptyState title="Konu bulunamadı" />;
  const t = q.data;
  const isOwn = user?.id === t.user_id;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Foruma dön
      </Link>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={t.profile?.avatar_url ?? undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.profile?.display_name ?? "Kullanıcı"}</p>
            <p className="text-[11px] text-muted-foreground">
              {new Date(t.created_at).toLocaleString("tr-TR")}
            </p>
          </div>
          {t.status === "solved" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Çözüldü
            </span>
          )}
        </div>

        <h1 className="mt-3 text-lg font-bold">{t.title}</h1>
        {(t.vehicle_brand || t.vehicle_model) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t.vehicle_brand} {t.vehicle_model}
          </p>
        )}
        <p className="mt-2 whitespace-pre-wrap text-sm">{t.body}</p>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={() => likeMut.mutate()}
            className={`flex items-center gap-1 ${t.liked_by_me ? "text-red-500" : "hover:text-foreground"}`}
          >
            <Heart className={`h-4 w-4 ${t.liked_by_me ? "fill-red-500" : ""}`} /> {t.like_count}
          </button>
          <button
            onClick={() => saveMut.mutate()}
            className={`flex items-center gap-1 ${t.saved_by_me ? "text-primary" : "hover:text-foreground"}`}
          >
            <Bookmark className={`h-4 w-4 ${t.saved_by_me ? "fill-primary" : ""}`} /> {t.save_count}
          </button>
          <div className="ml-auto">
            {isOwn ? (
              <button
                onClick={() => deleteMut.mutate()}
                className="flex items-center gap-1 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Sil
              </button>
            ) : (
              <ReportDialog targetType="forum_thread" targetId={threadId} />
            )}
          </div>
        </div>
      </div>

      <RepliesSection threadId={threadId} replies={t.replies} isThreadOwner={isOwn} />
    </div>
  );
}

type Reply = {
  id: string;
  user_id: string;
  body: string;
  is_solution: boolean;
  like_count: number;
  created_at: string;
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

function RepliesSection({
  threadId,
  replies,
  isThreadOwner,
}: {
  threadId: string;
  replies: Reply[];
  isThreadOwner: boolean;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const replyFn = useServerFn(createForumReply);
  const deleteReplyFn = useServerFn(deleteForumReply);
  const solutionFn = useServerFn(markReplySolution);
  const likeFn = useServerFn(toggleLike);
  const { user } = useAuth();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["forum-thread", threadId] });

  const replyMut = useMutation({
    mutationFn: () => replyFn({ data: { thread_id: threadId, body } }),
    onSuccess: () => {
      setBody("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteReplyFn({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const solutionMut = useMutation({
    mutationFn: ({ id, solved }: { id: string; solved: boolean }) =>
      solutionFn({ data: { reply_id: id, solved } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const likeMut = useMutation({
    mutationFn: (id: string) => likeFn({ data: { target_type: "forum_reply", target_id: id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{replies.length} yanıt</h2>
      <ul className="space-y-2">
        {replies.map((r) => (
          <li
            key={r.id}
            className={`rounded-lg border p-3 ${r.is_solution ? "border-green-500/50 bg-green-500/5" : "border-border bg-card"}`}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium">{r.profile?.display_name ?? "Kullanıcı"}</p>
              {r.is_solution && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600">
                  <Award className="h-3 w-3" /> Çözüm
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("tr-TR")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <button
                onClick={() => likeMut.mutate(r.id)}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Heart className="h-3 w-3" /> {r.like_count}
              </button>
              {isThreadOwner && (
                <button
                  onClick={() => solutionMut.mutate({ id: r.id, solved: !r.is_solution })}
                  className="hover:text-foreground"
                >
                  {r.is_solution ? "Çözüm işaretini kaldır" : "Çözüm olarak işaretle"}
                </button>
              )}
              {user?.id === r.user_id ? (
                <button
                  onClick={() => deleteMut.mutate(r.id)}
                  className="ml-auto hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : (
                <span className="ml-auto">
                  <ReportDialog targetType="forum_reply" targetId={r.id} />
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Yanıt yaz…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && body.trim()) replyMut.mutate();
          }}
        />
        <button
          onClick={() => replyMut.mutate()}
          disabled={replyMut.isPending || body.trim().length === 0}
          className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-50"
        >
          {replyMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
