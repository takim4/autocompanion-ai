import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MapPin, MessageCircle, Phone, Send, Star, Trash2 } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/data-state";
import {
  createQuoteRequest,
  deleteMechanicReview,
  getMechanic,
  getMyMechanicReview,
  listMechanicReviews,
  upsertMechanicReview,
} from "@/lib/mechanics.functions";
import { SPECIALTY_LABELS, type Specialty } from "@/lib/mechanic-data";

export const Route = createFileRoute("/_authenticated/mechanics/$id")({
  component: MechanicProfilePage,
  head: () => ({ meta: [{ title: "İşletme — AutoSocial" }] }),
});

type Mechanic = {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string;
  whatsapp: string | null;
  address: string;
  city: string;
  district: string | null;
  specialties: string[];
  brands: string[];
  bio: string | null;
  avg_rating: number;
  rating_count: number;
};

function MechanicProfilePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const getFn = useServerFn(getMechanic);
  const mechQ = useQuery({ queryKey: ["mechanic", id], queryFn: () => getFn({ data: { id } }) });

  const reviewsFn = useServerFn(listMechanicReviews);
  const reviewsQ = useQuery({
    queryKey: ["mechanic-reviews", id],
    queryFn: () => reviewsFn({ data: { mechanic_id: id } }),
  });

  const myReviewFn = useServerFn(getMyMechanicReview);
  const myReviewQ = useQuery({
    queryKey: ["my-mechanic-review", id],
    queryFn: () => myReviewFn({ data: { mechanic_id: id } }),
  });

  const invalidateReviews = () => {
    qc.invalidateQueries({ queryKey: ["mechanic-reviews", id] });
    qc.invalidateQueries({ queryKey: ["my-mechanic-review", id] });
    qc.invalidateQueries({ queryKey: ["mechanic", id] });
  };

  if (mechQ.isLoading) return <LoadingState label="İşletme yükleniyor…" />;

  const m = mechQ.data as Mechanic | null;
  if (!m) {
    return (
      <EmptyState
        title="İşletme bulunamadı"
        description="Bu işletme kaldırılmış olabilir."
        action={
          <Link to="/forum" className="text-sm font-medium text-primary hover:underline">
            Foruma dön
          </Link>
        }
      />
    );
  }

  const cleanPhone = m.phone.replace(/[^\d+]/g, "");
  const cleanWa = (m.whatsapp ?? m.phone).replace(/[^\d+]/g, "").replace(/^\+/, "");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Geri
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold">{m.business_name}</h1>
        {m.owner_name && <p className="text-sm text-muted-foreground">{m.owner_name}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {m.district ? `${m.district}, ` : ""}
            {m.city}
          </span>
          {m.rating_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
              {Number(m.avg_rating).toFixed(1)} ({m.rating_count} değerlendirme)
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{m.address}</p>
        {m.bio && <p className="mt-3 text-sm">{m.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.specialties.map((s) => (
            <span
              key={s}
              className="rounded-full bg-accent/30 px-2 py-0.5 text-[11px] text-accent-foreground"
            >
              {SPECIALTY_LABELS[s as Specialty] ?? s}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
          >
            <Phone className="h-3.5 w-3.5" /> Ara
          </a>
          <a
            href={`https://wa.me/${cleanWa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>
      </div>

      <QuoteBox mechanicId={m.id} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Değerlendirmeni bırak</h2>
        <ReviewForm
          mechanicId={m.id}
          myReview={myReviewQ.data ?? null}
          onSaved={invalidateReviews}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Değerlendirmeler ({reviewsQ.data?.length ?? 0})
        </h2>
        {reviewsQ.isLoading && <LoadingState label="Yükleniyor…" />}
        {reviewsQ.data && reviewsQ.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Henüz değerlendirme yok — ilkini sen bırak.
          </p>
        )}
        <ul className="space-y-3">
          {(reviewsQ.data ?? []).map(
            (r: {
              id: string;
              author_name: string;
              author_avatar: string | null;
              rating: number;
              comment: string | null;
              created_at: string;
            }) => (
              <li key={r.id} className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-muted text-sm">
                      {r.author_avatar?.startsWith("http") ? (
                        <img src={r.author_avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        r.author_avatar || "🙂"
                      )}
                    </span>
                    <span className="text-xs font-semibold">{r.author_name}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("tr-TR")}
                </p>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  );
}

function ReviewForm({
  mechanicId,
  myReview,
  onSaved,
}: {
  mechanicId: string;
  myReview: { id: string; rating: number; comment: string | null } | null;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [comment, setComment] = useState(myReview?.comment ?? "");

  const upsertFn = useServerFn(upsertMechanicReview);
  const mut = useMutation({
    mutationFn: () =>
      upsertFn({ data: { mechanic_id: mechanicId, rating, comment: comment.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Değerlendirmen kaydedildi.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFn = useServerFn(deleteMechanicReview);
  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { mechanic_id: mechanicId } }),
    onSuccess: () => {
      toast.success("Değerlendirmen silindi.");
      setRating(0);
      setComment("");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} yıldız`} className="p-0.5">
            <Star
              className={`h-6 w-6 ${n <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Deneyimini paylaş (isteğe bağlı)…"
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end gap-2">
        {myReview && (
          <button
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Sil
          </button>
        )}
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || rating === 0}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {myReview ? "Güncelle" : "Gönder"}
        </button>
      </div>
    </div>
  );
}

function QuoteBox({ mechanicId }: { mechanicId: string }) {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const fn = useServerFn(createQuoteRequest);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          mechanic_id: mechanicId,
          issue_summary: issue,
          preferred_contact: "in_app",
        },
      }),
    onSuccess: () => {
      toast.success("Teklif isteği gönderildi.");
      setOpen(false);
      setIssue("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Send className="h-3.5 w-3.5" /> Teklif iste
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <label className="mb-1 block text-xs font-medium">Sorun özeti</label>
      <textarea
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Aracında ne sorun var, ne zamandır devam ediyor…"
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
        >
          İptal
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || issue.trim().length < 5}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Gönder
        </button>
      </div>
    </div>
  );
}
