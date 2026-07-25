import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, MessageCircle, Phone, Send, Star, Store, User, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/data-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createQuoteRequest,
  listMechanicReviews,
  listNearbyMechanics,
  upsertMyMechanicReview,
} from "@/lib/mechanics.functions";
import {
  formatDistanceKm,
  SPECIALTIES,
  SPECIALTY_LABELS,
  TR_CITIES,
  type Specialty,
} from "@/lib/mechanic-data";

export const Route = createFileRoute("/_authenticated/services")({
  component: ServicesPage,
  head: () => ({ meta: [{ title: "Hizmetler — AutoSocial" }] }),
});

type Mechanic = {
  id: string;
  business_name: string;
  phone: string;
  whatsapp: string | null;
  address: string;
  city: string;
  district: string | null;
  specialties: string[];
  brands: string[];
  avg_rating: number;
  rating_count: number;
  google_rating: number | null;
  google_rating_count: number | null;
  google_maps_url: string | null;
  distance_km: number | null;
};

function ServicesPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [locating, setLocating] = useState(false);
  const fn = useServerFn(listNearbyMechanics);

  const q = useQuery({
    queryKey: ["services", { coords, city, specialties }],
    queryFn: () =>
      fn({
        data: {
          lat: coords?.lat,
          lng: coords?.lng,
          city: coords ? null : city,
          specialties,
          limit: 30,
        },
      }),
    enabled: !!(coords || city),
  });

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Tarayıcın konum desteklemiyor, şehir seçebilirsin.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.info("Konum reddedildi, şehir seçerek devam edebilirsin.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const toggleSpecialty = (s: Specialty) => {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Store className="h-6 w-6" /> Hizmetler
      </h1>
      <p className="text-sm text-muted-foreground">
        Yakınındaki doğrulanmış ustaları bul, fiyat teklifi al, iletişime geç.
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-card p-3">
        <button
          onClick={requestLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          Konumumu kullan
        </button>
        <span className="text-[11px] text-muted-foreground">veya şehir seç:</span>
        <select
          value={city ?? ""}
          onChange={(e) => {
            setCity(e.target.value || null);
            setCoords(null);
          }}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          <option value="">Şehir seç…</option>
          {TR_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SPECIALTIES.map((s) => {
          const on = specialties.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggleSpecialty(s)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                on
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {SPECIALTY_LABELS[s]}
            </button>
          );
        })}
      </div>

      {!coords && !city && (
        <EmptyState title="Ustaları görmek için konum ya da şehir seç" icon={MapPin} />
      )}
      {q.isLoading && (coords || city) && <LoadingState label="Ustalar aranıyor…" />}
      {q.data && q.data.length === 0 && <EmptyState title="Bu bölgede usta bulunamadı" />}

      <div className="grid gap-3 sm:grid-cols-2">
        {(q.data ?? []).map((m) => (
          <MechanicCard key={m.id} mechanic={m as Mechanic} />
        ))}
      </div>
    </div>
  );
}

function MechanicCard({ mechanic: m }: { mechanic: Mechanic }) {
  const [openDetail, setOpenDetail] = useState(false);
  const [openQuote, setOpenQuote] = useState(false);
  const cleanPhone = m.phone.replace(/[^\d+]/g, "");
  const cleanWa = (m.whatsapp ?? m.phone).replace(/[^\d+]/g, "").replace(/^\+/, "");

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{m.business_name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {m.district ? `${m.district}, ` : ""}
            {m.city}
            {m.distance_km != null && (
              <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                {formatDistanceKm(m.distance_km)}
              </span>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            <RatingBadge label="Uygulama" value={m.avg_rating} count={m.rating_count} />
            {m.google_rating != null && (
              <RatingBadge
                label="Google"
                value={m.google_rating}
                count={m.google_rating_count ?? 0}
              />
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.specialties.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] text-accent-foreground"
              >
                {SPECIALTY_LABELS[s as Specialty] ?? s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <a
          href={`tel:${cleanPhone}`}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium hover:bg-secondary/80"
        >
          <Phone className="h-3 w-3" /> Ara
        </a>
        <a
          href={`https://wa.me/${cleanWa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700"
        >
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </a>
        <button
          onClick={() => setOpenQuote(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-3 w-3" /> Teklif iste
        </button>
        <button
          onClick={() => setOpenDetail(true)}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
        >
          Yorumlar
        </button>
      </div>

      {openDetail && <ReviewsDialog mechanic={m} onClose={() => setOpenDetail(false)} />}
      {openQuote && <QuoteDialog mechanic={m} onClose={() => setOpenQuote(false)} />}
    </div>
  );
}

function RatingBadge({ label, value, count }: { label: string; value: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
      {value > 0 ? value.toFixed(1) : "—"}{" "}
      <span className="opacity-70">
        {label} ({count})
      </span>
    </span>
  );
}

function ReviewsDialog({ mechanic: m, onClose }: { mechanic: Mechanic; onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMechanicReviews);
  const upsertFn = useServerFn(upsertMyMechanicReview);
  const q = useQuery({
    queryKey: ["mechanic-reviews", m.id],
    queryFn: () => listFn({ data: { mechanic_id: m.id } }),
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const mut = useMutation({
    mutationFn: () => upsertFn({ data: { mechanic_id: m.id, rating, comment: comment || null } }),
    onSuccess: () => {
      toast.success("Yorumun kaydedildi.");
      setComment("");
      qc.invalidateQueries({ queryKey: ["mechanic-reviews", m.id] });
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{m.business_name} — Yorumlar</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {q.isLoading && <LoadingState />}
          {q.data && q.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Henüz yorum yok.</p>
          )}
          {(q.data ?? []).map((r) => (
            <div key={r.id} className="flex items-start gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                <AvatarFallback>
                  <User className="h-3.5 w-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium">{r.profile?.display_name ?? "Kullanıcı"}</p>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" /> {r.rating}
                  </span>
                </div>
                {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium">Puanla</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>
                <Star
                  className={`h-5 w-5 ${n <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Deneyimini paylaş (opsiyonel)"
            className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          />
        </div>
        <DialogFooter>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Gönder
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuoteDialog({ mechanic: m, onClose }: { mechanic: Mechanic; onClose: () => void }) {
  const [issue, setIssue] = useState("");
  const [contact, setContact] = useState<"in_app" | "phone" | "whatsapp">("in_app");
  const fn = useServerFn(createQuoteRequest);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          mechanic_id: m.id,
          issue_summary: issue,
          preferred_contact: contact,
        },
      }),
    onSuccess: () => {
      toast.success("Teklif isteği gönderildi.");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Teklif iste — {m.business_name}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mb-1 block text-[11px] font-medium">Ne için teklif istiyorsun?</label>
        <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Örn. periyodik bakım, fren balatası değişimi…"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <label className="mb-1 mt-2 block text-[11px] font-medium">Tercih ettiğin iletişim</label>
        <div className="flex gap-1">
          {(
            [
              ["in_app", "Uygulama içi"],
              ["phone", "Telefon"],
              ["whatsapp", "WhatsApp"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setContact(v)}
              className={`flex-1 rounded-md border px-2 py-1 text-[11px] ${
                contact === v
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            İptal
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || issue.trim().length < 5}
          >
            {mut.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Gönder
          </Button>
        </div>
      </div>
    </div>
  );
}
