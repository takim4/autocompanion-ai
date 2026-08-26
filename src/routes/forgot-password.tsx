import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Şifremi Unuttum — AutoSocial" }] }),
});

const schema = z.object({ email: z.string().trim().email("Geçerli bir e-posta") });

function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(v: z.infer<typeof schema>) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Sıfırlama linki gönderildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/auth" className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Girişe dön
        </Link>

        <h1 className="font-display text-3xl font-medium tracking-tight">Şifreni sıfırla</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          E-posta adresini gir, sıfırlama linki gönderelim.
        </p>

        {sent ? (
          <div className="mt-8 flex items-start gap-3 border-t border-border pt-6">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
            <p className="text-sm text-muted-foreground">
              E-posta kutunu kontrol et. Link 1 saat geçerli.
            </p>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4 border-t border-border pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <Button type="submit" variant="brand" className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Linki Gönder
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
