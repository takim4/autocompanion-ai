import { Megaphone } from "lucide-react";

/**
 * Placeholder ad units. Sizes/positions follow the wireframes; wire these up
 * to a real ad network later — the "Reklam"/"Sponsorlu" disclosure label
 * must stay visible on whatever replaces the placeholder content.
 */

const AD_LABEL_CLASS =
  "rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground";

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
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed border-border bg-card px-4 py-3.5 sm:px-5 ${className}`}
    >
      <span className={`absolute right-3 top-3 ${AD_LABEL_CLASS}`}>Reklam</span>
      <div className="flex items-center gap-3 pr-14">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <button className="hidden shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent/20 sm:block">
          {cta}
        </button>
      </div>
    </div>
  );
}

export function AdSquare({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-4 text-center ${className}`}
    >
      <span className={AD_LABEL_CLASS}>Reklam</span>
      <Megaphone className="h-6 w-6 text-muted-foreground" />
      <p className="text-[11px] leading-tight text-muted-foreground">
        Reklam alanı — 300×250
      </p>
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
  return (
    <article
      className={`rounded-2xl border border-dashed border-border bg-card p-4 ${className}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Megaphone className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold">{advertiser}</span>
        </div>
        <span className={AD_LABEL_CLASS}>Sponsorlu</span>
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <button className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
        {cta}
      </button>
    </article>
  );
}

export function AdVideoTile({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex aspect-[9/16] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-card p-4 text-center ${className}`}
    >
      <span className={`absolute left-2 top-2 ${AD_LABEL_CLASS}`}>Sponsorlu</span>
      <Megaphone className="h-8 w-8 text-muted-foreground" />
      <p className="text-xs font-medium">Reklamınız burada görünebilir</p>
      <button className="mt-1 rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground">
        İncele
      </button>
    </div>
  );
}
