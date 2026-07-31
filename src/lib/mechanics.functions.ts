import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SPECIALTIES, TR_CITIES, type Specialty } from "./mechanic-data";

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
});

const ListInput = z
  .object({
    city: z.string().max(60).optional().nullable(),
    specialties: z.array(SpecialtyEnum).max(9).optional(),
    brand: z.string().max(60).optional().nullable(),
    limit: z.number().int().min(1).max(50).optional().default(15),
  })
  .merge(CoordSchema);

const MECHANIC_SELECT =
  "id, business_name, phone, whatsapp, address, city, district, lat, lng, specialties, brands, avg_rating, rating_count";

type MechanicSearchRow = {
  id: string;
  business_name: string;
  phone: string;
  whatsapp: string | null;
  address: string;
  city: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  specialties: string[];
  brands: string[];
  avg_rating: number;
  rating_count: number;
};

type MechanicSearchResult = MechanicSearchRow & { distance_km: number | null };

const LIVE_SEARCH_RADIUS_KM = 25;
const NEARBY_MAX_KM = 60; // Konum varsa: bu mesafeden uzak ustalar listede gösterilmez
const LIVE_SEARCH_MIN_RESULTS = 3;

const LIVE_SEARCH_TERMS: Record<Specialty, string> = {
  motor: "oto motor ustası",
  "elektrik-elektronik": "oto elektrikçi",
  "kaporta-boya": "oto kaporta boya",
  şanzıman: "oto şanzıman ustası",
  "fren-süspansiyon": "oto fren süspansiyon ustası",
  klima: "oto klima servisi",
  "lastik-rot-balans": "lastik rot balans",
  egzoz: "oto egzoz servisi",
  "genel bakım": "oto tamirci",
};

function distanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function sortMechanicsByDistance(rows: MechanicSearchRow[], data: z.infer<typeof ListInput>) {
  const withDist = rows.map((r) => {
    let distance_km: number | null = null;
    if (data.lat != null && data.lng != null && r.lat != null && r.lng != null) {
      distance_km = distanceKm({ lat: data.lat, lng: data.lng }, { lat: r.lat, lng: r.lng });
    }
    return { ...r, distance_km };
  }) satisfies MechanicSearchResult[];

  withDist.sort((a, b) => {
    if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
    if (a.distance_km != null) return -1;
    if (b.distance_km != null) return 1;
    return (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0);
  });

  return withDist;
}

function hasEnoughLocalMechanics(rows: Array<{ distance_km: number | null }>, limit: number) {
  const nearby = rows.filter((r) => r.distance_km != null && r.distance_km <= LIVE_SEARCH_RADIUS_KM);
  return nearby.length >= Math.min(LIVE_SEARCH_MIN_RESULTS, limit);
}

function buildLiveSearchQueries(specialties?: Specialty[]) {
  const selected = specialties && specialties.length > 0 ? specialties : (["genel bakım"] as Specialty[]);
  return Array.from(new Set(selected.slice(0, 2).map((s) => LIVE_SEARCH_TERMS[s] ?? "oto tamirci")));
}

export const listNearbyMechanics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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

    // Konum (lat/lng) ile arandığında mesafeye göre JS tarafında sıralanacağı için,
    // SQL limiti gösterilecek sayıya değil daha geniş bir aday havuzuna uygulanır —
    // yoksa DB'nin rastgele döndürdüğü ilk N kayıt gerçek en yakınları eleyebilir.
    const hasCoords = data.lat != null && data.lng != null;
    const poolLimit = hasCoords ? Math.max(data.limit * 10, 200) : data.limit;

    const fetchRows = async (db: any) => {
      let q = db
        .from("mechanics")
        .select(MECHANIC_SELECT)
        .eq("verified", true)
        .eq("active", true);

      if (data.city) q = q.ilike("city", data.city);
      if (data.specialties && data.specialties.length > 0) {
        q = q.overlaps("specialties", data.specialties);
      }
      if (data.brand) q = q.or(`brands.cs.{${data.brand}},brands.eq.{}`);

      const { data: rows, error } = await q.limit(poolLimit);
      if (error) throw new Error(error.message);
      return (rows ?? []) as MechanicSearchRow[];
    };

    const rows = await fetchRows(client);
    const sorted = sortMechanicsByDistance(rows, data);
    // Konum verildiyse yalnızca gerçekten yakın olanları (≤ NEARBY_MAX_KM) döndür;
    // aksi halde başka şehirdeki eski scrape sonuçları "en yakın" gibi görünür.
    const filtered = hasCoords
      ? sorted.filter((r) => r.distance_km != null && r.distance_km <= NEARBY_MAX_KM)
      : sorted;
    return filtered.slice(0, data.limit);
  });

const LiveImportInput = z
  .object({
    specialties: z.array(SpecialtyEnum).max(9).optional(),
    limit: z.number().int().min(1).max(50).optional().default(15),
  })
  .merge(CoordSchema.required());

const SCRAPE_CACHE_TTL_DAYS = 30;
// ~0.045° ≈ 5 km. Aynı hücreye tekrar Apify çağrısı yapılmasın.
const CELL_SIZE_DEG = 0.045;

function cellKey(lat: number, lng: number, specialties: Specialty[]) {
  const clat = Math.round(lat / CELL_SIZE_DEG) * CELL_SIZE_DEG;
  const clng = Math.round(lng / CELL_SIZE_DEG) * CELL_SIZE_DEG;
  const specKey = [...specialties].sort().join(",");
  return `${clat.toFixed(3)}:${clng.toFixed(3)}:${specKey}`;
}

export const importNearbyMechanicsFromGoogleMaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => LiveImportInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const selectedSpecialties =
      data.specialties && data.specialties.length > 0
        ? (data.specialties as Specialty[])
        : (["genel bakım"] as Specialty[]);

    const key = cellKey(data.lat, data.lng, selectedSpecialties);

    // 1) Cache kontrolü — bu bölge son 30 gün içinde tarandıysa Apify'ı atla.
    const cutoff = new Date(Date.now() - SCRAPE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabaseAdmin
      .from("mechanic_scrape_log")
      .select("id, scraped_at, result_count")
      .eq("cell_key", key)
      .gte("scraped_at", cutoff)
      .order("scraped_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return { imported: 0, cached: true, cachedAt: cached.scraped_at };
    }

    // 2) Cache yok → Tavily ile sadece kullanıcının çevresindeki bölgeyi ara.
    const { searchMechanicsWithTavily, reverseGeocodeLabel } = await import("./tavily.server");
    const locationHint = await reverseGeocodeLabel(data.lat, data.lng);
    const found = await searchMechanicsWithTavily({
      queries: buildLiveSearchQueries(selectedSpecialties),
      locationHint,
      maxResultsPerQuery: Math.max(8, Math.min(20, data.limit)),
    });

    const importedRows = found.map((r) => ({
      business_name: r.business_name,
      phone: r.phone,
      address: r.address,
      city: r.city,
      district: r.district,
      lat: r.lat,
      lng: r.lng,
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      external_id: r.external_id,
      specialties: selectedSpecialties,
      brands: [],
      verified: true,
      active: true,
      source: "tavily",
    }));

    if (importedRows.length > 0) {
      const { error } = await supabaseAdmin
        .from("mechanics")
        .upsert(importedRows, { onConflict: "external_id" });
      if (error) throw new Error(error.message);
    }

    // 3) Tarama günlüğünü kaydet — sonuç boş olsa bile, tekrar tekrar denenmesin.
    await supabaseAdmin.from("mechanic_scrape_log").insert({
      cell_key: key,
      lat: data.lat,
      lng: data.lng,
      radius_km: LIVE_SEARCH_RADIUS_KM,
      specialties: selectedSpecialties,
      result_count: importedRows.length,
    });

    return { imported: importedRows.length, cached: false };
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
    if (error) {
      if (error.code === "23514" || /son 24 saatte/i.test(error.message)) {
        throw new Error("Bu ustaya son 24 saatte zaten teklif isteği gönderdin. Cevabını beklerken başka bir ustayı da deneyebilirsin.");
      }
      throw new Error(error.message);
    }
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

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.role);
  });

const ImportInput = z.object({
  query: z.string().min(2).max(100),
  cities: z.array(z.string().min(2).max(60)).min(1).max(TR_CITIES.length),
  specialty: SpecialtyEnum.optional().default("genel bakım"),
});

/**
 * Admin-only: Apify Google Maps Scraper ile gerçek usta/sanayi işletmesi verisi çeker ve
 * `mechanics` tablosuna upsert eder (external_id = Google place_id, çakışmada günceller).
 * Sonuç sayısına sınır KOYULMAZ; seçilen her şehir için ayrı arama terimi olarak tek Apify
 * çağrısında taranır ("Tüm Türkiye" seçilirse 81 il tek seferde taranır).
 * Kullanıcı hesabı olmadığından bu satırlar user_id = NULL ile "sahipsiz" (source=google_maps) kaydedilir.
 */
export const importMechanicsFromGoogleMaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ImportInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!adminRole) throw new Error("Bu işlem için admin yetkisi gerekli");

    const { searchMechanicsWithTavily } = await import("./tavily.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const perCity = await Promise.all(
      data.cities.map((city) =>
        searchMechanicsWithTavily({
          queries: [data.query],
          locationHint: city,
          maxResultsPerQuery: 10,
        }).catch(() => []),
      ),
    );
    const rows = perCity.flat();
    if (rows.length === 0) return { imported: 0 };


    const { error } = await supabaseAdmin.from("mechanics").upsert(
      rows.map((r) => ({
        business_name: r.business_name,
        phone: r.phone,
        address: r.address,
        city: r.city,
        district: r.district,
        lat: r.lat,
        lng: r.lng,
        avg_rating: r.avg_rating,
        rating_count: r.rating_count,
        external_id: r.external_id,
        specialties: [data.specialty],
        brands: [],
        verified: true,
        active: true,
        source: "tavily",
      })),
      { onConflict: "external_id" },
    );
    if (error) throw new Error(error.message);
    return { imported: rows.length };
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
