import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runFactCheck } from "./fact-checker.server";

const PASS_THRESHOLD = 0.7;

/**
 * Serbest metin / forum taslağı doğrulaması. Forum ekibi bu fonksiyonu "gönder" butonuna
 * basılmadan önce çağırmalı: `passed === false` ise gönderi engellenmeli ve
 * `flagged_claims` kullanıcıya gösterilmelidir (skor eşiği: %70).
 */
const CheckTextInput = z.object({
  text: z.string().min(10, "En az 10 karakter yazın").max(4000),
  url: z.string().url().max(2000).optional().nullable(),
});

export const checkText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CheckTextInput.parse(i))
  .handler(async ({ data, context }) => {
    const { result, sources } = await runFactCheck({
      supabase: context.supabase,
      text: data.text,
      url: data.url ?? null,
    });
    const passed = result.score >= PASS_THRESHOLD;

    const { error } = await context.supabase.from("fact_checks").insert({
      user_id: context.userId,
      target_type: "text",
      input_text: data.text,
      input_url: data.url ?? null,
      score: result.score,
      passed,
      verdict: { ...result, sources },
    });
    if (error) throw new Error(error.message);

    return { ...result, passed, threshold: PASS_THRESHOLD, sources };
  });

const CheckVehicleInput = z.object({ vehicle_id: z.string().uuid() });

export const checkVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CheckVehicleInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: v, error: vErr } = await context.supabase
      .from("vehicles")
      .select("brand, model, year, fuel, transmission, engine_cc, engine_code, mileage_km")
      .eq("id", data.vehicle_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!v) throw new Error("Araç bulunamadı");

    const text = [
      `${v.year} ${v.brand} ${v.model}`,
      v.engine_cc ? `Motor hacmi: ${v.engine_cc}cc` : null,
      v.engine_code ? `Motor kodu: ${v.engine_code}` : null,
      v.fuel ? `Yakıt: ${v.fuel}` : null,
      v.transmission ? `Şanzıman: ${v.transmission}` : null,
      v.mileage_km ? `Kilometre: ${v.mileage_km} km` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const { result, sources } = await runFactCheck({
      supabase: context.supabase,
      text,
      contextLabel: "Kullanıcının garajına kayıtlı araç teknik özellikleri girdisi",
    });
    const passed = result.score >= PASS_THRESHOLD;

    const { error } = await context.supabase.from("fact_checks").insert({
      user_id: context.userId,
      target_type: "vehicle",
      vehicle_id: data.vehicle_id,
      input_text: text,
      score: result.score,
      passed,
      verdict: { ...result, sources },
    });
    if (error) throw new Error(error.message);

    return { ...result, passed, threshold: PASS_THRESHOLD, sources };
  });

export const listMyFactChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fact_checks")
      .select("id, target_type, input_text, input_url, score, passed, verdict, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
