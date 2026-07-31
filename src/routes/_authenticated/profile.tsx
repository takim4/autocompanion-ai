import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Award,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-state";
import { getMyProfile } from "@/lib/garage.functions";
import { getMyRoles, importMechanicsFromGoogleMaps } from "@/lib/mechanics.functions";
import { SPECIALTIES, SPECIALTY_LABELS, TR_CITIES, type Specialty } from "@/lib/mechanic-data";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profil — AutoSocial" }] }),
});

function ProfilePage() {
  const fn = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["me"], queryFn: () => fn() });

  const rolesFn = useServerFn(getMyRoles);
  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const isAdmin = (rolesQ.data ?? []).includes("admin");

  if (q.isLoading) return <LoadingState />;
  const p = q.data;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{p?.display_name ?? "Kullanıcı"}</h1>
            {p?.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-semibold text-accent-foreground">
            <Award className="h-4 w-4" />
            {p?.reputation ?? 0}
          </div>
        </div>
        {p?.bio && <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>}
      </div>

      <div className="grid gap-2">
        <ProfileLink
          to="/fact-check"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Doğruluk Kontrolü"
          desc="Araç özellikleri, modifiye detayları veya forum girdilerini AI ile doğrula."
        />
        <ProfileLink
          to="/quotes"
          icon={<FileText className="h-4 w-4" />}
          title="Tekliflerim"
          desc="Ustalara gönderdiğin teklif istekleri ve gelen cevaplar."
        />
        <ProfileLink
          to="/whatsapp-history"
          icon={<MessageCircle className="h-4 w-4" />}
          title="WhatsApp Geçmişi"
          desc="Ustalara gönderdiğin teşhis mesajları, tarih ve usta bilgisiyle."
        />
        <ProfileLink
          to="/mechanic-panel"
          icon={<Wrench className="h-4 w-4" />}
          title="Usta Paneli"
          desc="Ustaysan işletme profilini yönet, teklifleri cevapla."
        />
      </div>

      {isAdmin && <AdminMechanicsImport />}
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
    <div className="rounded-2xl border border-dashed border-border bg-card p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <MapPin className="h-4 w-4" /> Admin — Tavily ile Usta İçe Aktar
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
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value as Specialty)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        >
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {SPECIALTY_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          Şehirler ({cities.length} seçili)
        </span>
        <button
          type="button"
          onClick={() => setCities(allSelected ? [] : [...TR_CITIES])}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          {allSelected ? "Tümünü kaldır" : "Tüm Türkiye (81 il)"}
        </button>
      </div>
      <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-border bg-background p-2">
        <div className="flex flex-wrap gap-1">
          {TR_CITIES.map((c) => {
            const active = cities.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCity(c)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
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
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        İçe aktar
      </button>
    </div>
  );
}

function ProfileLink({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/30"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
