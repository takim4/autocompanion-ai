import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Yeni Şifre — AutoSocial" }] }),
});

const schema = z
  .object({
    password: z.string().min(8, "En az 8 karakter"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Şifreler eşleşmiyor",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(v: z.infer<typeof schema>) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: v.password });
      if (error) throw error;
      toast.success("Şifre güncellendi");
      nav({ to: "/forum" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-medium tracking-tight">Yeni şifre belirle</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hesabın için yeni bir şifre oluştur.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4 border-t border-border pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="password">Yeni Şifre</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Tekrar</Label>
            <Input id="confirm" type="password" {...form.register("confirm")} />
            {form.formState.errors.confirm && (
              <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
            )}
          </div>
          <Button type="submit" variant="brand" className="w-full" size="lg" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Şifreyi Güncelle
          </Button>
        </form>
      </div>
    </div>
  );
}
