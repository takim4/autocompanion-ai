import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Award,
  Car,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  User,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-state";
import { listAllAdRequests, reviewAdRequest } from "@/lib/ads.functions";
import { getMyProfile, listVehicles } from "@/lib/garage.functions";
import { getMyRoles, importMechanicsFromGoogleMaps } from "@/lib/mechanics.functions";
import { SPECIALTIES, SPECIALTY_LABELS, TR_CITIES, type Specialty } from "@/lib/mechanic-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profil — AutoSocial" }] }),
});

const LINKS = [
  { to: "/garage", icon: Car, title: "Garajım", big: true },
  { to: "/fact-check", icon: ShieldCheck, title: "Doğruluk Kontrolü", big: false },
  { to: "/quotes", icon: FileText, title: "Tekliflerim", big: false },
  { to: "/whatsapp-history", icon: MessageCircle, title: "WhatsApp Geçmişi", big: false },
  { to: "/mechanic-panel", icon: Wrench, title: "Usta Paneli", big: false },
  { to: "/advertise", icon: Megaphone, title: "Reklam Ver", big: false },
] as const;

function ProfilePage() {
  const fn = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["me"], queryFn: () => fn() });

  const rolesFn = useServerFn(getMyRoles);
  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const isAdmin = (rolesQ.data ?? []).includes("admin");

  const vehiclesFn = useServerFn(listVehicles);
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: () => vehiclesFn() });

  if (q.isLoading) return <LoadingState />;
  const p = q.data;

  return (
    <div>
      <section className="cut node-orbit-bg relative overflow-hidden bg-brand-gradient p-8 sm:p-10">
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10">
              <User className="h-7 w-7" />
            </div>
            <div>
              <p className="font-mono text-xs text-white/40">@{p?.username ?? "kullanıcı"}</p>
              <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
                {p?.display_name ?? "Kullanıcı"}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-5xl font-medium leading-none">{p?.reputation ?? 0}</p>
            <p className="mt-1 flex items-center justify-end gap-1 text-xs text-white/50">
              <Award className="h-3.5 w-3.5" /> itibar
            </p>
          </div>
        </div>
        {p?.bio && <p className="relative mt-6 max-w-lg text-sm text-white/70">{p.bio}</p>}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={l.to as any}
            className={cn(
              "cut card-interactive group flex flex-col justify-between border border-border p-5",
              l.big && "col-span-2 row-span-2 sm:col-span-2",
            )}
          >
            <l.icon className={cn("text-muted-foreground/60", l.big ? "h-8 w-8" : "h-5 w-5")} strokeWidth={1.25} />
            <div className="mt-6 flex items-end justify-between gap-2">
              <p className={cn("font-display font-medium leading-tight", l.big ? "text-2xl" : "text-sm")}>{l.title}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>
          </Link>
        ))}
        <div className="cut flex flex-col justify-between border border-dashed border-border p-5">
          <span className="font-mono text-xs text-muted-foreground">Araç</span>
          <p className="font-display text-4xl font-medium">{vehiclesQ.data?.length ?? 0}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-10 space-y-6 border-t border-border pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Yönetim</p>
          <AdminMechanicsImport />
          <AdminAdRequests />
        </div>
      )}
    </div>
  );
}

function AdminMechanicsImport() {
  const [query, setQuery] = useState("oto tamirci");
  const [cities, setCities] = useState<string[]>(["İstanbul"]);
  const [specialty, setSpecialty] = useState<Specialty>("genel bakım");

  const toggleCity = (c: string) => {
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };
  const allSelected = cities.length === TR_CITIES.length;

  const fn = useServerFn(importMechanicsFromGoogleMaps);
  const mut = useMutation({
    mutationFn: () => fn({ data: { query, cities, specialty } }),
    onSuccess: (r) => toast.success(`${r.imported} usta içe aktarıldı (${cities.length} şehir).`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="cut border border-dashed border-border p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <MapPin className="h-4 w-4" /> Tavily ile Usta İçe Aktar
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Tavily web araması ile seçilen her şehirdeki oto sanayi/usta kayıtlarını bulur ve
        doğrulanmış (verified) olarak `mechanics` tablosuna ekler. Çok şehir seçmek çalışma süresini
        uzatır.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Arama terimi (örn. oto elektrikçi)"
          className="border-b border-border bg-transparent px-1 py-1.5 text-xs outline-none focus:border-foreground"
        />
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value as Specialty)}
          className="border-b border-border bg-transparent px-1 py-1.5 text-xs outline-none focus:border-foreground"
        >
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {SPECIALTY_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          Şehirler ({cities.length} seçili)
        </span>
        <button
          type="button"
          onClick={() => setCities(allSelected ? [] : [...TR_CITIES])}
          className="text-[11px] font-semibold underline"
        >
          {allSelected ? "Tümünü kaldır" : "Tüm Türkiye (81 il)"}
        </button>
      </div>
      <div className="mt-1 max-h-32 overflow-y-auto border border-border p-2">
        <div className="flex flex-wrap gap-1">
          {TR_CITIES.map((c) => {
            const active = cities.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCity(c)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || cities.length === 0}
        className="cut-sm mt-3 inline-flex items-center gap-1.5 bg-brand-gradient px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
      >
        {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        İçe aktar
      </button>
    </div>
  );
}

const AD_STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

function AdminAdRequests() {
  const qc = useQueryClient();
  const fn = useServerFn(listAllAdRequests);
  const q = useQuery({ queryKey: ["admin-ad-requests"], queryFn: () => fn() });

  const reviewFn = useServerFn(reviewAdRequest);
  const reviewMut = useMutation({
    mutationFn: (input: { id: string; decision: "approve" | "reject" }) =>
      reviewFn({ data: input }),
    onSuccess: () => {
      toast.success("Karar kaydedildi.");
      qc.invalidateQueries({ queryKey: ["admin-ad-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="cut border border-dashed border-border p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Megaphone className="h-4 w-4" /> Reklam Talepleri
      </h2>
      {q.isLoading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor…
        </div>
      )}
      {q.data && q.data.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Henüz reklam talebi yok.</p>
      )}
      <ul className="mt-3 divide-y divide-border">
        {(q.data ?? []).map(
          (r: {
            id: string;
            ad_type: string;
            business_name: string;
            title: string;
            description: string;
            budget_try: number;
            duration_days: number;
            status: string;
            contact_email: string;
          }) => (
            <li key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {r.business_name} <span className="text-muted-foreground">· {r.ad_type}</span>
                  </p>
                  <p className="text-xs">{r.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ₺{r.budget_try} · {r.duration_days} gün · {r.contact_email}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {AD_STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              {r.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => reviewMut.mutate({ id: r.id, decision: "approve" })}
                    disabled={reviewMut.isPending}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Onayla
                  </button>
                  <button
                    onClick={() => reviewMut.mutate({ id: r.id, decision: "reject" })}
                    disabled={reviewMut.isPending}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Reddet
                  </button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
