import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Award, MessageCircle, Star, User } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/data-state";
import { listPostsByUser, toggleFollow } from "@/lib/forum.functions";
import {
  getPublicProfile,
  rateProfile,
  removeProfileRating,
} from "@/lib/profile-ratings.functions";

export const Route = createFileRoute("/_authenticated/u/$userId")({
  component: PublicProfilePage,
  head: () => ({ meta: [{ title: "Profil — AutoSocial" }] }),
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const qc = useQueryClient();

  const profileFn = useServerFn(getPublicProfile);
  const profileQ = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => profileFn({ data: { id: userId } }),
  });

  const postsFn = useServerFn(listPostsByUser);
  const postsQ = useQuery({
    queryKey: ["user-posts", userId],
    queryFn: () => postsFn({ data: { user_id: userId } }),
  });

  const followFn = useServerFn(toggleFollow);
  const followMut = useMutation({
    mutationFn: () => followFn({ data: { followee_id: userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-profile", userId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rateFn = useServerFn(rateProfile);
  const unrateFn = useServerFn(removeProfileRating);
  const rateMut = useMutation({
    mutationFn: (rating: number) => rateFn({ data: { profile_id: userId, rating } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-profile", userId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const unrateMut = useMutation({
    mutationFn: () => unrateFn({ data: { profile_id: userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-profile", userId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (profileQ.isLoading) return <LoadingState label="Profil yükleniyor…" />;

  const p = profileQ.data;
  if (!p) {
    return (
      <EmptyState
        title="Kullanıcı bulunamadı"
        description="Bu profil silinmiş olabilir."
        action={
          <Link to="/forum" className="text-sm font-medium underline">
            Foruma dön
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/forum"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Geri
      </Link>

      <div className="flex items-start gap-4 border-b border-border pb-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-2xl font-medium tracking-tight">{p.display_name ?? "Kullanıcı"}</h1>
          {p.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium">
              <Award className="h-3.5 w-3.5" /> {p.reputation ?? 0} itibar
            </span>
            {p.rating_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" />
                {Number(p.avg_rating).toFixed(1)} ({p.rating_count} puan)
              </span>
            )}
          </div>
        </div>
        {!p.is_self && (
          <button
            onClick={() => followMut.mutate()}
            disabled={followMut.isPending}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              p.is_following ? "border border-border" : "bg-brand-gradient"
            }`}
          >
            {p.is_following ? "Takipte" : "Takip Et"}
          </button>
        )}
      </div>
      {p.bio && <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>}

      {p.is_self ? (
        <p className="mt-4 border-b border-border pb-6 text-xs text-muted-foreground">
          Bu senin profilin.{" "}
          <Link to="/profile" className="font-semibold underline">
            Profilini düzenle
          </Link>
        </p>
      ) : (
        <div className="mt-4 border-b border-border pb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bu kullanıcıyı puanla
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => rateMut.mutate(n)} disabled={rateMut.isPending} aria-label={`${n} yıldız`} className="p-0.5">
                <Star className={`h-5 w-5 ${p.my_rating && n <= p.my_rating ? "fill-current" : "text-muted-foreground"}`} />
              </button>
            ))}
            {p.my_rating && (
              <button
                onClick={() => unrateMut.mutate()}
                disabled={unrateMut.isPending}
                className="ml-2 text-[11px] text-muted-foreground hover:text-destructive"
              >
                Puanını kaldır
              </button>
            )}
          </div>
        </div>
      )}

      <section className="pt-6">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" /> Forum gönderileri
        </h2>
        {postsQ.isLoading && <LoadingState label="Yükleniyor…" />}
        {postsQ.data && postsQ.data.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz forum gönderisi yok.</p>
        )}
        <ul className="divide-y divide-border">
          {(postsQ.data ?? []).map((post) => (
            <li key={post.id}>
              <Link to="/forum/$postId" params={{ postId: post.id }} className="flex items-center justify-between gap-2 py-3">
                <span className="truncate text-sm font-medium">{post.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {post.like_count} beğeni · {post.comment_count} yorum
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
