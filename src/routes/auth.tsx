import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logoAsset from "@/assets/autosocial-logo.png.asset.json";

const searchSchema = z.object({
  redirect: fallback(z.string(), "").default(""),
});

const POST_AUTH_REDIRECT_KEY = "autosocial:post-auth-redirect";
const REMEMBER_KEY = "autosocial:remember-email";

const DOSSIER = [
  {
    n: "01",
    title: "AI teşhis",
    text: "Belirtiyi yaz, ajan olası sebepleri ve önerilen adımları saniyeler içinde sıralar.",
  },
  {
    n: "02",
    title: "Topluluk doğrulaması",
    text: "Aynı aracı kullanan binlerce kişinin oyuyla doğru çözümler öne çıkar.",
  },
  {
    n: "03",
    title: "Kişisel garaj",
    text: "Aracını ekle; markana ve modeline özel kronik sorunları ve geçmişini tut.",
  },
];

function safeRedirect(value: string): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/forum";
}

function readStoredRedirect() {
  const storedTarget = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (storedTarget) window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  return storedTarget;
}

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Giriş — AutoSocial" },
      { name: "description", content: "AutoSocial hesabınıza giriş yapın veya kayıt olun." },
    ],
  }),
});

type Mode = "login" | "register";

const schema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "En az 6 karakter"),
  display_name: z.string().trim().max(60).optional(),
});
type FormValues = z.infer<typeof schema>;

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const redirectedRef = useRef(false);
  const router = useRouter();
  const search = Route.useSearch();
  const target = safeRedirect(search.redirect);

  const goTarget = useCallback(
    async (nextTarget = target) => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      await router.invalidate();
      await router.navigate({ to: safeRedirect(nextTarget), replace: true });
    },
    [router, target],
  );

  useEffect(() => {
    let cancelled = false;

    async function redirectExistingSession() {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;

      await goTarget(readStoredRedirect() || search.redirect);
    }

    redirectExistingSession();

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user || cancelled) return;
      queueMicrotask(() => {
        void goTarget(readStoredRedirect() || search.redirect);
      });
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
    };
  }, [goTarget, search.redirect]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", display_name: "" },
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        form.setValue("email", saved);
        setRemember(true);
      } else {
        setRemember(false);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      if (mode === "login") {
        window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, target);
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        try {
          if (remember) window.localStorage.setItem(REMEMBER_KEY, values.email);
          else window.localStorage.removeItem(REMEMBER_KEY);
        } catch {
          /* ignore */
        }
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error("Oturum doğrulanamadı. Lütfen tekrar giriş yapın.");
        toast.success("Hoş geldin!");
        await goTarget();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
            data: { display_name: values.display_name },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Kayıt başarılı! Yönlendiriliyorsun.");
          await goTarget();
        } else {
          toast.success("Kayıt başarılı! E-postanı doğruladıktan sonra giriş yapabilirsin.");
          setMode("login");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, target);
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) throw res.error;
      if (!res.redirected) await goTarget();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google girişi başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Sol — editoryal dosya/kapak paneli, her iki temada da sabit mürekkep yüzey */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient px-14 py-14 lg:flex">
        <div className="node-orbit-bg pointer-events-none absolute inset-0" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white/10">
            <img src={logoAsset.url} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-lg font-semibold">AutoSocial</span>
        </Link>

        <div className="relative max-w-lg">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            AI Destekli Otomobil Bilgi Platformu
          </p>
          <h1 className="font-display text-[2.75rem] font-medium leading-[1.08] tracking-tight">
            Aracınla ilgili her sorunun cevabı, tek yerde.
          </h1>

          <div className="mt-12 space-y-6 border-t border-white/10 pt-8">
            {DOSSIER.map((item) => (
              <div key={item.n} className="flex gap-5">
                <span className="font-display text-sm text-white/35">{item.n}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/30">© {new Date().getFullYear()} AutoSocial</p>
      </div>

      {/* Sağ — form */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-brand-gradient">
              <img src={logoAsset.url} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-lg font-semibold">AutoSocial</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {mode === "login" ? "Tekrar hoş geldin" : "Aramıza katıl"}
          </p>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">
            {mode === "login" ? "Giriş yap" : "Hesap oluştur"}
          </h2>

          <div className="mt-8 flex gap-6 border-b border-border text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${
                mode === "login" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Giriş
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${
                mode === "register" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="display_name">Ad Soyad</Label>
                <Input id="display_name" {...form.register("display_name")} placeholder="Örn. Ahmet Yılmaz" />
                {form.formState.errors.display_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="ornek@mail.com" autoComplete="email" />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                {mode === "login" && (
                  <Link to="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                    Unuttum
                  </Link>
                )}
              </div>
              <Input id="password" type="password" {...form.register("password")}
                autoComplete={mode === "login" ? "current-password" : "new-password"} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            {mode === "login" && (
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-foreground"
                />
                Beni hatırla
              </label>
            )}

            <Button type="submit" variant="brand" className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">veya</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google ile devam et
          </Button>
        </div>
      </div>
    </div>
  );
}
