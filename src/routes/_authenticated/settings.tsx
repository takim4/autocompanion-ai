import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/data-state";
import { supabase } from "@/integrations/supabase/client";
import { useThemeStore, type Theme } from "@/stores/theme-store";
import { getMyProfile, updateMyProfile } from "@/lib/garage.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Ayarlar — AutoSocial" }] }),
});

function SettingsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { theme, setTheme } = useThemeStore();
  const getFn = useServerFn(getMyProfile);
  const upFn = useServerFn(updateMyProfile);

  const q = useQuery({ queryKey: ["me"], queryFn: () => getFn() });
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (q.data) {
      setDisplayName(q.data.display_name ?? "");
      setBio(q.data.bio ?? "");
    }
  }, [q.data]);

  const mut = useMutation({
    mutationFn: () =>
      upFn({ data: { display_name: displayName, bio: bio || undefined } }),
    onSuccess: () => {
      toast.success("Profil güncellendi");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Hata"),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (q.isLoading) return <LoadingState />;

  const themes: { v: Theme; label: string; icon: typeof Sun }[] = [
    { v: "light", label: "Açık", icon: Sun },
    { v: "dark", label: "Koyu", icon: Moon },
    { v: "system", label: "Sistem", icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-8 border-b border-border pb-4">
        <h1 className="font-display text-3xl font-medium tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profil, görünüm ve hesap</p>
      </header>

      <section className="border-b border-border py-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profil</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="dn">Ad Soyad</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bio">Hakkımda</Label>
            <Textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Otomobil tutkunu, hobi tamirci..."
            />
          </div>
          <Button variant="brand" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </section>

      <section className="border-b border-border py-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Görünüm</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.v}
                onClick={() => setTheme(t.v)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                  theme === t.v ? "border-foreground" : "border-border hover:border-foreground/40"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Hesap</h2>
        <Button variant="destructive" className="mt-4" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
        </Button>
      </section>
    </div>
  );
}
