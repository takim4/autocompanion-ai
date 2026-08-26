import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ExternalLink,
  Loader2,
  MessageSquareText,
  Star,
  Wrench,
  Send,
  MapPin,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMyMechanicProfile,
  listIncomingQuoteRequests,
  listMechanicReviews,
  respondQuote,
  upsertMechanicProfile,
} from "@/lib/mechanics.functions";
import { SPECIALTIES, SPECIALTY_LABELS, TR_CITIES, type Specialty } from "@/lib/mechanic-data";

export const Route = createFileRoute("/_authenticated/mechanic-panel")({
  component: MechanicPanel,
  head: () => ({ meta: [{ title: "Usta Paneli — AutoSocial" }] }),
});

function MechanicPanel() {
  const profileFn = useServerFn(getMyMechanicProfile);
  const q = useQuery({ queryKey: ["my-mechanic"], queryFn: () => profileFn() });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
      </div>
    );
  }

  const p = q.data as { id: string; avg_rating: number; rating_count: number } | null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" /> İşletme Hesabı
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">Usta Paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            İşletme profilini yönet ve gelen teklif isteklerini cevapla.
          </p>
        </div>
        {p && (
          <div className="flex items-center gap-4">
            {p.rating_count > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star className="h-4 w-4 fill-current" />
                {Number(p.avg_rating).toFixed(1)} ({p.rating_count})
              </span>
            )}
            <Link
              to="/mechanics/$id"
              params={{ id: p.id }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> İşletme sayfamı gör
            </Link>
          </div>
        )}
      </header>

      <ProfileEditor profile={q.data} />
      {q.data && <IncomingRequests />}
      {p && <ReviewsReceived mechanicId={p.id} />}
    </div>
  );
}

function ReviewsReceived({ mechanicId }: { mechanicId: string }) {
  const fn = useServerFn(listMechanicReviews);
  const q = useQuery({
    queryKey: ["mechanic-reviews", mechanicId],
    queryFn: () => fn({ data: { mechanic_id: mechanicId } }),
  });

  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <MessageSquareText className="h-3.5 w-3.5" /> Gelen Değerlendirmeler
      </h2>
      {q.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor…
        </div>
      )}
      {q.data && q.data.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Henüz müşteri değerlendirmesi yok.
        </div>
      )}
      <ul className="divide-y divide-border">
        {(q.data ?? []).map(
          (r: {
            id: string;
            author_name: string;
            rating: number;
            comment: string | null;
            created_at: string;
          }) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{r.author_name}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </div>
              {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("tr-TR")}
              </p>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function ProfileEditor({ profile }: { profile: unknown }) {
  const p = profile as {
    business_name?: string;
    owner_name?: string | null;
    phone?: string;
    whatsapp?: string | null;
    email?: string | null;
    address?: string;
    city?: string;
    district?: string | null;
    lat?: number | null;
    lng?: number | null;
    specialties?: string[];
    brands?: string[];
    bio?: string | null;
    active?: boolean;
  } | null;

  const qc = useQueryClient();
  const fn = useServerFn(upsertMechanicProfile);
  const [form, setForm] = useState({
    business_name: p?.business_name ?? "",
    owner_name: p?.owner_name ?? "",
    phone: p?.phone ?? "",
    whatsapp: p?.whatsapp ?? "",
    email: p?.email ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    district: p?.district ?? "",
    lat: p?.lat ?? null,
    lng: p?.lng ?? null,
    specialties: (p?.specialties ?? []) as string[],
    brands: (p?.brands ?? []).join(", "),
    bio: p?.bio ?? "",
    active: p?.active ?? true,
  });

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          business_name: form.business_name,
          owner_name: form.owner_name || null,
          phone: form.phone,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          address: form.address,
          city: form.city,
          district: form.district || null,
          lat: form.lat,
          lng: form.lng,
          specialties: form.specialties as Specialty[],
          brands: form.brands
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean),
          bio: form.bio || null,
          active: form.active,
        },
      }),
    onSuccess: () => {
      toast.success("Profil kaydedildi.");
      qc.invalidateQueries({ queryKey: ["my-mechanic"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSpec = (s: Specialty) => {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter((x) => x !== s)
        : [...f.specialties, s],
    }));
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })),
      () => toast.error("Konum alınamadı"),
    );
  };

  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">İşletme Profili</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="İşletme adı *"
          value={form.business_name}
          onChange={(v) => setForm({ ...form, business_name: v })}
        />
        <Input
          label="Sahibinin adı"
          value={form.owner_name}
          onChange={(v) => setForm({ ...form, owner_name: v })}
        />
        <Input
          label="Telefon *"
          value={form.phone}
          placeholder="+90 555 000 00 00"
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <Input
          label="WhatsApp"
          value={form.whatsapp}
          placeholder="+90 555 000 00 00"
          onChange={(v) => setForm({ ...form, whatsapp: v })}
        />
        <Input
          label="E-posta"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Şehir *</label>
          <select
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full border-b border-border bg-transparent py-1.5 text-sm outline-none focus:border-foreground"
          >
            <option value="">Şehir seç…</option>
            {TR_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="İlçe"
          value={form.district}
          onChange={(v) => setForm({ ...form, district: v })}
        />
        <div className="md:col-span-2">
          <Input
            label="Adres *"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs hover:border-foreground"
          >
            <MapPin className="h-3.5 w-3.5" /> Konumumu kullan
          </button>
          <span className="text-[11px] text-muted-foreground">
            {form.lat != null && form.lng != null
              ? `Kayıtlı: ${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}`
              : "Koordinat kayıtlı değil (mesafeli sıralama için önerilir)"}
          </span>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uzmanlık alanları *</label>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTIES.map((s) => {
              const on = form.specialties.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpec(s)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    on ? "border-foreground bg-primary text-primary-foreground" : "border-border hover:border-foreground/40"
                  }`}
                >
                  {SPECIALTY_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2">
          <Input
            label="Uzmanlaştığın markalar (virgülle, boş = tümü)"
            value={form.brands}
            placeholder="Fiat, Renault, Peugeot"
            onChange={(v) => setForm({ ...form, brands: v })}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tanıtım</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            maxLength={1000}
            className="w-full resize-none border-b border-border bg-transparent py-1.5 text-sm outline-none focus:border-foreground"
          />
        </div>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Profilim aktif (yeni teklif isteği alabilirim)
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => mut.mutate()}
          disabled={
            mut.isPending ||
            !form.business_name ||
            !form.phone ||
            !form.address ||
            !form.city ||
            form.specialties.length === 0
          }
          className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Kaydet
        </button>
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-border bg-transparent py-1.5 text-sm outline-none focus:border-foreground"
      />
    </div>
  );
}

function IncomingRequests() {
  const fn = useServerFn(listIncomingQuoteRequests);
  const q = useQuery({ queryKey: ["incoming-quotes"], queryFn: () => fn() });

  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gelen Teklif İstekleri</h2>
      {q.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor…
        </div>
      )}
      {q.data && q.data.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Henüz teklif isteği yok.
        </div>
      )}
      <ul className="space-y-3">
        {(q.data ?? []).map((r) => (
          <IncomingRequestCard key={r.id} req={r} />
        ))}
      </ul>
    </section>
  );
}

function IncomingRequestCard({ req }: { req: Record<string, unknown> }) {
  const qc = useQueryClient();
  const fn = useServerFn(respondQuote);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [etaDays, setEtaDays] = useState<string>("");

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          request_id: req.id as string,
          message,
          price_min: priceMin ? Number(priceMin) : null,
          price_max: priceMax ? Number(priceMax) : null,
          eta_days: etaDays ? Number(etaDays) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Teklif gönderildi.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["incoming-quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vehicle = req.vehicle as { brand: string; model: string; year: number } | null;
  const responses = (req.responses ?? []) as Array<{
    id: string;
    price_min: number | null;
    price_max: number | null;
  }>;
  const already = responses.length > 0;
  const contact = req.preferred_contact as string;

  return (
    <li className="border-b border-border pb-5 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {vehicle ? `${vehicle.year} ${vehicle.brand} ${vehicle.model}` : "Araç belirtilmemiş"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(req.created_at as string).toLocaleString("tr-TR")} · Tercih: {contact}
          </p>
        </div>
        {already && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cevaplandı
          </span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-xs">{req.issue_summary as string}</p>
      {req.diagnosis_snapshot ? (
        <details className="mt-2 border-l-2 border-border pl-2 text-[11px]">
          <summary className="cursor-pointer font-medium">AI teşhis özeti</summary>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-muted-foreground">
            {req.diagnosis_snapshot as string}
          </pre>
        </details>
      ) : null}

      {!open && !already && (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold"
        >
          <Send className="h-3 w-3" /> Teklif ver
        </button>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Min ₺"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="border-b border-border bg-transparent py-1 text-xs outline-none focus:border-foreground"
            />
            <input
              type="number"
              placeholder="Max ₺"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="border-b border-border bg-transparent py-1 text-xs outline-none focus:border-foreground"
            />
            <input
              type="number"
              placeholder="Süre (gün)"
              value={etaDays}
              onChange={(e) => setEtaDays(e.target.value)}
              className="border-b border-border bg-transparent py-1 text-xs outline-none focus:border-foreground"
            />
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Açıklama, parça dahil mi, ne yapılacak…"
            className="w-full resize-none border-b border-border bg-transparent py-1 text-xs outline-none focus:border-foreground"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-foreground"
            >
              İptal
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || message.trim().length < 2}
              className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold disabled:opacity-50"
            >
              {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Gönder
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// Suppress unused
export const _Phone = Phone;
