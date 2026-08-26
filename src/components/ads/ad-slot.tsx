import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { listActiveAds } from "@/lib/ads.functions";

/**
 * Onaylanmış gerçek reklam talepleri (bkz. /advertise + admin onayı) varsa
 * bu bileşenler o içeriği gösterir; yoksa aşağıdaki placeholder'a düşer.
 * "Reklam"/"Sponsorlu" etiketi her iki durumda da görünür kalır.
 */

type LiveAd = {
  id: string;
  ad_type: "banner" | "square" | "native" | "video";
  business_name: string;
  title: string;
  description: string;
  cta_label: string;
  target_url: string;
  image_url: string | null;
};

function useLiveAd(type: LiveAd["ad_type"]): LiveAd | null {
  const fn = useServerFn(listActiveAds);
  const q = useQuery({ queryKey: ["active-ads"], queryFn: () => fn(), staleTime: 60_000 });
  return useMemo(() => {
    const matches = ((q.data ?? []) as LiveAd[]).filter((a) => a.ad_type === type);
    if (matches.length === 0) return null;
    return matches[Math.floor(Math.random() * matches.length)];
  }, [q.data, type]);
}

const AD_LABEL_CLASS =
  "rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground";

const ADVERTISE_EMAIL = "reklam@autosocial.app";

function notifyPlaceholder(title: string) {
  toast.info(
    `"${title}" bir örnek reklam alanıdır — gerçek reklam sistemi entegre edildiğinde tıklanabilir olacak.`,
  );
}

export function AdBanner({
  className = "",
  title = "İşletmeni burada tanıt",
  description = "AutoSocial kullanıcılarına markanı, servisini veya ürününü ulaştır.",
  cta = "Reklam Ver",
}: {
  className?: string;
  title?: string;
  description?: string;
  cta?: string;
}) {
  const ad = useLiveAd("banner");
  const shown = ad
    ? { title: ad.title, description: ad.description, cta: ad.cta_label, href: ad.target_url }
    : {
        title,
        description,
        cta,
        href: `mailto:${ADVERTISE_EMAIL}?subject=${encodeURIComponent("AutoSocial'da reklam vermek istiyorum")}`,
      };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed border-border bg-card px-4 py-3.5 sm:px-5 ${className}`}
    >
      <span className={`absolute right-3 top-3 ${AD_LABEL_CLASS}`}>Reklam</span>
      <div className="flex items-center gap-3 pr-14">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-dim text-foreground">
          {ad?.image_url ? (
            <img src={ad.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Megaphone className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{shown.title}</p>
          <p className="truncate text-xs text-muted-foreground">{shown.description}</p>
        </div>
        <a
          href={shown.href}
          target={ad ? "_blank" : undefined}
          rel={ad ? "noopener noreferrer" : undefined}
          className="hidden shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent/20 sm:block"
        >
          {shown.cta}
        </a>
      </div>
    </div>
  );
}

export function AdSquare({ className = "" }: { className?: string }) {
  const ad = useLiveAd("square");
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-4 text-center ${className}`}
    >
      <span className={AD_LABEL_CLASS}>Reklam</span>
      {ad?.image_url ? (
        <img src={ad.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
      ) : (
        <Megaphone className="h-6 w-6 text-muted-foreground" />
      )}
      <p className="text-[11px] leading-tight text-muted-foreground">
        {ad ? ad.description : "Reklam alanı — 300×250"}
      </p>
      <a
        href={ad ? ad.target_url : `mailto:${ADVERTISE_EMAIL}`}
        target={ad ? "_blank" : undefined}
        rel={ad ? "noopener noreferrer" : undefined}
        className="text-[11px] font-medium text-primary hover:underline"
      >
        {ad ? ad.cta_label : "Reklam Ver"}
      </a>
    </div>
  );
}

export function NativeAdCard({
  advertiser = "AutoSocial Ortakları",
  title = "Aracınıza özel yedek parça kampanyaları",
  description = "Sponsorlu içerik — bu gönderi bir reklam ortağı tarafından desteklenmektedir.",
  cta = "Keşfet",
  className = "",
}: {
  advertiser?: string;
  title?: string;
  description?: string;
  cta?: string;
  className?: string;
}) {
  const ad = useLiveAd("native");
  const shown = ad
    ? {
        advertiser: ad.business_name,
        title: ad.title,
        description: ad.description,
        cta: ad.cta_label,
      }
    : { advertiser, title, description, cta };

  return (
    <article className={`rounded-2xl border border-dashed border-border bg-card p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-dim text-foreground">
            {ad?.image_url ? (
              <img src={ad.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
          </div>
          <span className="text-xs font-semibold">{shown.advertiser}</span>
        </div>
        <span className={AD_LABEL_CLASS}>Sponsorlu</span>
      </div>
      <p className="text-sm font-medium">{shown.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{shown.description}</p>
      {ad ? (
        <a
          href={ad.target_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold"
        >
          {shown.cta}
        </a>
      ) : (
        <button
          onClick={() => notifyPlaceholder(title)}
          className="mt-3 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold"
        >
          {shown.cta}
        </button>
      )}
    </article>
  );
}

export function AdVideoTile({ className = "" }: { className?: string }) {
  const ad = useLiveAd("video");
  return (
    <div
      className={`relative flex aspect-[9/16] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-card p-4 text-center ${className}`}
      style={
        ad?.image_url
          ? {
              backgroundImage: `url(${ad.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <span className={`absolute left-2 top-2 ${AD_LABEL_CLASS}`}>Sponsorlu</span>
      {!ad?.image_url && <Megaphone className="h-8 w-8 text-muted-foreground" />}
      <p
        className={`text-xs font-medium ${ad?.image_url ? "rounded bg-black/50 px-2 py-1 text-white" : ""}`}
      >
        {ad ? ad.title : "Reklamınız burada görünebilir"}
      </p>
      {ad ? (
        <a
          href={ad.target_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 rounded-full bg-brand-gradient px-3 py-1 text-[11px] font-semibold"
        >
          {ad.cta_label}
        </a>
      ) : (
        <button
          onClick={() => notifyPlaceholder("Reklamınız burada görünebilir")}
          className="mt-1 rounded-full bg-brand-gradient px-3 py-1 text-[11px] font-semibold"
        >
          İncele
        </button>
      )}
    </div>
  );
}
