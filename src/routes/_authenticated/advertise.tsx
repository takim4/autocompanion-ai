import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2, Megaphone } from "lucide-react";
import { LoadingState } from "@/components/data-state";
import { createAdRequest, listMyAdRequests } from "@/lib/ads.functions";
import { uploadUserMedia } from "@/lib/media-upload";

export const Route = createFileRoute("/_authenticated/advertise")({
  component: AdvertisePage,
  head: () => ({ meta: [{ title: "Reklam Ver — AutoSocial" }] }),
});

const AD_TYPES = [
  { id: "banner", label: "Banner", desc: "Forum akışı üzerinde geniş kart" },
  { id: "square", label: "Kare", desc: "Yan panelde 300×250 kare alan" },
  { id: "native", label: "Doğal (native)", desc: "Forum akışına gömülü sponsorlu gönderi" },
  { id: "video", label: "Video", desc: "Reels akışında dikey video alanı" },
] as const;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Beklemede", className: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Onaylandı", className: "bg-green-500/15 text-green-600" },
  rejected: { label: "Reddedildi", className: "bg-destructive/15 text-destructive" },
};

function AdvertisePage() {
  const qc = useQueryClient();
  const [adType, setAdType] = useState<(typeof AD_TYPES)[number]["id"]>("banner");
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("İncele");
  const [targetUrl, setTargetUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [durationDays, setDurationDays] = useState("14");
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createFn = useServerFn(createAdRequest);
  const mut = useMutation({
    mutationFn: async () => {
      let image_url: string | undefined;
      if (image) {
        const uploaded = await uploadUserMedia(image.file, "ads");
        image_url = uploaded.url;
      }
      return createFn({
        data: {
          ad_type: adType,
          business_name: businessName.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim() || undefined,
          title: title.trim(),
          description: description.trim(),
          cta_label: ctaLabel.trim() || undefined,
          target_url: targetUrl.trim(),
          image_url,
          budget_try: Number(budget),
          duration_days: Number(durationDays),
        },
      });
    },
    onSuccess: () => {
      toast.success("Reklam talebin alındı — inceleyip en kısa sürede dönüş yapacağız.");
      qc.invalidateQueries({ queryKey: ["my-ad-requests"] });
      setBusinessName("");
      setContactEmail("");
      setContactPhone("");
      setTitle("");
      setDescription("");
      setCtaLabel("İncele");
      setTargetUrl("");
      setBudget("");
      setDurationDays("14");
      if (image) URL.revokeObjectURL(image.preview);
      setImage(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myAdsFn = useServerFn(listMyAdRequests);
  const myAdsQ = useQuery({ queryKey: ["my-ad-requests"], queryFn: () => myAdsFn() });

  const valid =
    businessName.trim() &&
    contactEmail.trim() &&
    title.trim() &&
    description.trim() &&
    targetUrl.trim() &&
    budget &&
    Number(budget) >= 0 &&
    durationDays &&
    Number(durationDays) >= 1;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Geri
      </Link>

      <header className="rounded-2xl border border-border bg-card p-6">
        <h1 className="flex items-center gap-2.5 text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Megaphone className="h-4.5 w-4.5" />
          </span>
          Reklam Ver
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Talebini gönder, ekibimiz inceleyip seninle iletişime geçsin. Onaylanan reklamlar seçtiğin
          alanda gerçek kullanıcılara gösterilir. Ödeme şu an için fatura/banka havalesi ile manuel
          olarak alınıyor — onay maili sonrası ödeme detayları iletilir.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium">Reklam alanı</label>
          <div className="grid grid-cols-2 gap-2">
            {AD_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAdType(t.id)}
                className={`rounded-lg border px-3 py-2 text-left text-xs ${
                  adType === t.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent/30"
                }`}
              >
                <p className="font-semibold">{t.label}</p>
                <p className="text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="İşletme / marka adı *" value={businessName} onChange={setBusinessName} />
          <Field
            label="İletişim e-postası *"
            value={contactEmail}
            onChange={setContactEmail}
            type="email"
          />
          <Field label="Telefon" value={contactPhone} onChange={setContactPhone} />
          <Field
            label="Hedef bağlantı (URL) *"
            value={targetUrl}
            onChange={setTargetUrl}
            placeholder="https://…"
          />
        </div>

        <Field label="Reklam başlığı *" value={title} onChange={setTitle} maxLength={100} />
        <div>
          <label className="mb-1 block text-xs font-medium">Açıklama *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Buton yazısı" value={ctaLabel} onChange={setCtaLabel} maxLength={30} />
          <Field label="Bütçe (₺) *" value={budget} onChange={setBudget} type="number" />
          <Field
            label="Süre (gün) *"
            value={durationDays}
            onChange={setDurationDays}
            type="number"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Görsel (isteğe bağlı)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (image) URL.revokeObjectURL(image.preview);
              setImage({ file: f, preview: URL.createObjectURL(f) });
              e.target.value = "";
            }}
          />
          {image ? (
            <div className="flex items-center gap-2">
              <img src={image.preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(image.preview);
                  setImage(null);
                }}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Kaldır
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/30"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Görsel ekle
            </button>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => mut.mutate()}
            disabled={!valid || mut.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_hsl(var(--shadow-color)/0.6)] disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Talebi Gönder
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Taleplerim</h2>
        {myAdsQ.isLoading && <LoadingState label="Yükleniyor…" />}
        {myAdsQ.data && myAdsQ.data.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz reklam talebin yok.</p>
        )}
        <ul className="space-y-2">
          {(myAdsQ.data ?? []).map(
            (r: {
              id: string;
              title: string;
              ad_type: string;
              status: string;
              admin_note: string | null;
              starts_at: string | null;
              ends_at: string | null;
              created_at: string;
            }) => {
              const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
              return (
                <li key={r.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.className}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {r.ad_type} · {new Date(r.created_at).toLocaleDateString("tr-TR")}
                    {r.status === "approved" && r.starts_at && r.ends_at && (
                      <>
                        {" "}
                        · {new Date(r.starts_at).toLocaleDateString("tr-TR")} –{" "}
                        {new Date(r.ends_at).toLocaleDateString("tr-TR")} arası yayında
                      </>
                    )}
                  </p>
                  {r.admin_note && (
                    <p className="mt-1 text-xs italic text-muted-foreground">"{r.admin_note}"</p>
                  )}
                </li>
              );
            },
          )}
        </ul>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
