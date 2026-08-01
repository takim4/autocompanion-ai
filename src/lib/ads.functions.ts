import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { db } from "@/lib/untyped-supabase";

const AdRequestInput = z.object({
  ad_type: z.enum(["banner", "square", "native", "video"]),
  business_name: z.string().min(1).max(120),
  contact_email: z.string().email().max(255),
  contact_phone: z.string().max(40).optional(),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  cta_label: z.string().min(1).max(30).optional().default("İncele"),
  target_url: z.string().url().max(2000),
  image_url: z.string().url().max(2000).optional(),
  budget_try: z.number().min(0).max(10_000_000),
  duration_days: z.number().int().min(1).max(90),
});

export const createAdRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AdRequestInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await db(context.supabase)
      .from("ad_requests")
      .insert({ ...data, advertiser_id: context.userId, status: "pending" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyAdRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await db(context.supabase)
      .from("ad_requests")
      .select("*")
      .eq("advertiser_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listActiveAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await db(context.supabase)
      .from("ad_requests")
      .select("id, ad_type, business_name, title, description, cta_label, target_url, image_url")
      .eq("status", "approved")
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString());
    if (error) throw new Error(error.message);
    return data ?? [];
  });

async function requireAdmin(client: ReturnType<typeof db>, userId: string) {
  const { data } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Bu işlem için admin yetkisi gerekli");
}

export const listAllAdRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = db(context.supabase);
    await requireAdmin(client, context.userId);
    const { data, error } = await client
      .from("ad_requests")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ReviewInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  admin_note: z.string().max(500).optional(),
});

export const reviewAdRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReviewInput.parse(i))
  .handler(async ({ data, context }) => {
    const client = db(context.supabase);
    await requireAdmin(client, context.userId);

    if (data.decision === "reject") {
      const { error } = await client
        .from("ad_requests")
        .update({ status: "rejected", admin_note: data.admin_note ?? null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { data: reqRow, error: reqErr } = await client
      .from("ad_requests")
      .select("duration_days")
      .eq("id", data.id)
      .single();
    if (reqErr) throw new Error(reqErr.message);

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + reqRow.duration_days * 24 * 60 * 60 * 1000);
    const { error } = await client
      .from("ad_requests")
      .update({
        status: "approved",
        admin_note: data.admin_note ?? null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
