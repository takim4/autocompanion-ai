import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
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
    <div className="node-orbit-bg flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/[0.03]">
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-dim text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">Yeni şifre belirle</h1>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
