import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SPECIALTIES } from "./mechanic-data";

const CoordSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .partial();

const SpecialtyEnum = z.enum(SPECIALTIES);

const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?\d[\d\s-]{7,18}\d$/, "Geçerli bir telefon numarası girin");

const MechanicProfileInput = z.object({
  business_name: z.string().min(2).max(120),
  owner_name: z.string().max(120).optional().nullable(),
  phone: PhoneSchema,
  whatsapp: PhoneSchema.optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().min(5).max(400),
  city: z.string().min(2).max(60),
  district: z.string().max(60).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  specialties: z.array(SpecialtyEnum).min(1).max(9),
  brands: z.array(z.string().min(1).max(60)).max(20).optional().default([]),
  bio: z.string().max(1000).optional().nullable(),
  active: z.boolean().optional(),
  google_rating: z.number().min(0).max(5).optional().nullable(),
  google_rating_count: z.number().int().min(0).optional().nullable(),
  google_maps_url: z.string().url().max(500).optional().nullable(),
});

const ListInput = z
  .object({
    city: z.string().max(60).optional().nullable(),
    specialties: z.array(SpecialtyEnum).max(9).optional(),
    brand: z.string().max(60).optional().nullable(),
    limit: z.number().int().min(1).max(50).optional().default(15),
  })
  .merge(CoordSchema);

export const listNearbyMechanics = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ListInput.parse(i ?? {}))
  .handler(async ({ data }) => {
    // Anon-safe okuma; supabase client with publishable key.
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    let q = client
      .from("mechanics")
      .select(
        "id, business_name, phone, whatsapp, address, city, district, lat, lng, specialties, brands, avg_rating, rating_count, google_rating, google_rating_count, google_maps_url",
      )
      .eq("verified", true)
      .eq("active", true)
      .limit(data.limit);

    if (data.city) q = q.ilike("city", data.city);
    if (data.specialties && data.specialties.length > 0) {
      q = q.overlaps("specialties", data.specialties);
    }
    if (data.brand) q = q.or(`brands.cs.{${data.brand}},brands.eq.{}`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Mesafe hesabı (Haversine, JS tarafında)
    const withDist = (rows ?? []).map((r) => {
      let distance_km: number | null = null;
      if (data.lat != null && data.lng != null && r.lat != null && r.lng != null) {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(r.lat - data.lat);
        const dLng = toRad(r.lng - data.lng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(data.lat)) * Math.cos(toRad(r.lat)) * Math.sin(dLng / 2) ** 2;
        distance_km = 2 * R * Math.asin(Math.sqrt(a));
      }
      return { ...r, distance_km };
    });

    withDist.sort((a, b) => {
      if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
      if (a.distance_km != null) return -1;
      if (b.distance_km != null) return 1;
      return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    });

    return withDist;
  });

export const getMechanic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row, error } = await client
      .from("mechanics")
      .select("*")
      .eq("id", data.id)
      .eq("verified", true)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// --- KİMLİKLİ İŞLEMLER ---

export const getMyMechanicProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mechanics")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertMechanicProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MechanicProfileInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("mechanics")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { data: row, error } = await context.supabase
        .from("mechanics")
        .update({ ...data, brands: data.brands ?? [] })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("mechanics")
      .insert({ ...data, brands: data.brands ?? [], user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const CreateQuoteInput = z.object({
  mechanic_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable().optional(),
  conversation_id: z.string().uuid().nullable().optional(),
  issue_summary: z.string().min(5).max(2000),
  diagnosis_snapshot: z.string().max(4000).optional().nullable(),
  preferred_contact: z.enum(["in_app", "phone", "whatsapp"]).default("in_app"),
});

export const createQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateQuoteInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("quote_requests")
      .insert({
        user_id: context.userId,
        mechanic_id: data.mechanic_id,
        vehicle_id: data.vehicle_id ?? null,
        conversation_id: data.conversation_id ?? null,
        issue_summary: data.issue_summary,
        diagnosis_snapshot: data.diagnosis_snapshot ?? null,
        preferred_contact: data.preferred_contact,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyQuoteRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quote_requests")
      .select(
        "id, issue_summary, status, preferred_contact, created_at, mechanic:mechanics(id, business_name, phone, whatsapp, city), responses:quote_responses(id, price_min, price_max, currency, message, eta_days, created_at)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listIncomingQuoteRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("mechanics")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!me) return [];
    const { data, error } = await context.supabase
      .from("quote_requests")
      .select(
        "id, issue_summary, diagnosis_snapshot, status, preferred_contact, created_at, vehicle:vehicles(brand, model, year), responses:quote_responses(id, price_min, price_max, message, eta_days)",
      )
      .eq("mechanic_id", me.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const RespondQuoteInput = z.object({
  request_id: z.string().uuid(),
  price_min: z.number().min(0).max(10_000_000).optional().nullable(),
  price_max: z.number().min(0).max(10_000_000).optional().nullable(),
  message: z.string().min(2).max(2000),
  eta_days: z.number().int().min(0).max(365).optional().nullable(),
  parts_included: z.boolean().optional().default(false),
});

export const respondQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RespondQuoteInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: me, error: meErr } = await context.supabase
      .from("mechanics")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) throw new Error("Usta profili bulunamadı");

    const { data: req, error: reqErr } = await context.supabase
      .from("quote_requests")
      .select("id, mechanic_id")
      .eq("id", data.request_id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req || req.mechanic_id !== me.id) throw new Error("Bu isteğe cevap veremezsiniz");

    const { data: row, error } = await context.supabase
      .from("quote_responses")
      .insert({
        request_id: data.request_id,
        mechanic_id: me.id,
        price_min: data.price_min ?? null,
        price_max: data.price_max ?? null,
        message: data.message,
        eta_days: data.eta_days ?? null,
        parts_included: data.parts_included ?? false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["accepted", "declined", "closed"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quote_requests")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- USTA YORUM & PUANLARI (app içi puan + Google puanı gösterimi) ---

export const listMechanicReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ mechanic_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("mechanic_reviews")
      .select("*")
      .eq("mechanic_id", data.mechanic_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
    let profileMap = new Map<
      string,
      {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    >();
    if (ids.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    }
    return (rows ?? []).map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null }));
  });

const UpsertReviewInput = z.object({
  mechanic_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

export const upsertMyMechanicReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpsertReviewInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("mechanic_reviews")
      .select("id")
      .eq("mechanic_id", data.mechanic_id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { data: row, error } = await context.supabase
        .from("mechanic_reviews")
        .update({ rating: data.rating, comment: data.comment ?? null })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("mechanic_reviews")
      .insert({
        mechanic_id: data.mechanic_id,
        user_id: context.userId,
        rating: data.rating,
        comment: data.comment ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMyMechanicReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ mechanic_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("mechanic_reviews")
      .delete()
      .eq("mechanic_id", data.mechanic_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
