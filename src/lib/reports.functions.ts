import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const ReportTarget = z.enum([
  "post",
  "forum_thread",
  "forum_reply",
  "comment",
  "community",
  "community_message",
  "mechanic",
  "user",
]);
const ReportReason = z.enum([
  "spam",
  "harassment",
  "hate_speech",
  "nudity",
  "misinformation",
  "scam",
  "illegal",
  "other",
]);

export const REPORT_REASON_LABELS: Record<string, string> = {
  spam: "Spam / istenmeyen içerik",
  harassment: "Taciz veya zorbalık",
  hate_speech: "Nefret söylemi / ayrımcılık",
  nudity: "Müstehcen içerik",
  misinformation: "Yanlış bilgi",
  scam: "Dolandırıcılık",
  illegal: "Yasa dışı içerik",
  other: "Diğer",
};

const CreateReportInput = z.object({
  target_type: ReportTarget,
  target_id: z.string().uuid(),
  community_id: z.string().uuid().optional().nullable(),
  reason: ReportReason,
  details: z.string().max(1000).optional().nullable(),
});

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateReportInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("reports")
      .insert({
        reporter_id: context.userId,
        target_type: data.target_type,
        target_id: data.target_id,
        community_id: data.community_id ?? null,
        reason: data.reason,
        details: data.details ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("*")
      .eq("reporter_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Uygulama adminleri: sadece genel (topluluk-dışı) veya eskale edilmiş şikayetleri görür.
export const listAdminReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ status: z.enum(["open", "reviewing", "resolved", "dismissed"]).optional() })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return await withReporterProfiles(context.supabase, rows ?? []);
  });

// Topluluk kurucu/co-admin'leri: sadece kendi topluluklarının şikayetleri (RLS zaten sınırlıyor).
export const listCommunityReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ community_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("reports")
      .select("*")
      .eq("community_id", data.community_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return await withReporterProfiles(context.supabase, rows ?? []);
  });

const ResolveInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  resolution_note: z.string().max(1000).optional().nullable(),
});

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ResolveInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("reports")
      .update({
        status: data.status,
        resolution_note: data.resolution_note ?? null,
        handled_by: context.userId,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Topluluk admini gerekli görürse şikayeti uygulama adminlerine iletir.
export const escalateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("reports")
      .update({ escalated: true, status: "open" })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

async function withReporterProfiles<T extends { reporter_id: string }>(
  supabase: SupabaseClient<Database>,
  rows: T[],
) {
  const ids = [...new Set(rows.map((r) => r.reporter_id))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, reporter_profile: null }));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, reporter_profile: map.get(r.reporter_id) ?? null }));
}
