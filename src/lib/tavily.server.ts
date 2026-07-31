/**
 * Tavily Search API entegrasyonu — `mechanics` tablosunu gerçek oto tamircisi/sanayi
 * verisiyle doldurmak için kullanılır (Apify Google Maps Scraper'ın yerini alır).
 * Server-only — TAVILY_API_KEY gerektirir.
 *
 * Akış:
 *  1) Tavily ile web araması (işletme rehberi / harita sayfaları)
 *  2) Gemini ile sonuç metinlerinden yapılandırılmış işletme kayıtları çıkarımı
 *  3) OpenStreetMap Nominatim ile adresten koordinat (mesafe sıralaması için)
 */
import { generateObject } from "ai";
import { z } from "zod";
import { geminiProvider, SUPPORT_CHAT_MODEL } from "./gemini.server";
import { TR_CITIES } from "./mechanic-data";

export type ImportedMechanic = {
  business_name: string;
  phone: string;
  address: string;
  city: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  avg_rating: number;
  rating_count: number;
  external_id: string;
};

type TavilyResult = { title?: string; url?: string; content?: string; raw_content?: string | null };

const ExtractedSchema = z.object({
  businesses: z
    .array(
      z.object({
        business_name: z.string(),
        phone: z.string(),
        address: z.string(),
        city: z.string(),
        district: z.string().nullable(),
      }),
    )
    .max(40),
});

/** Tavily'de tek bir sorgu çalıştırır. */
async function tavilySearch(query: string, maxResults: number): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY eksik. Ortam değişkenlerine ekleyin.");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: maxResults,
      include_raw_content: true,
      country: "turkey",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tavily isteği başarısız (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { results?: TavilyResult[] };
  return Array.isArray(json.results) ? json.results : [];
}

function guessCityFromText(text: string): string | null {
  const lower = text.toLocaleLowerCase("tr-TR");
  for (const city of TR_CITIES) {
    if (lower.includes(city.toLocaleLowerCase("tr-TR"))) return city;
  }
  return null;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const only = digits.replace(/\D/g, "");
  if (only.length < 10 || only.length > 15) return null;
  if (only.startsWith("90")) return `+${only}`;
  if (only.startsWith("0")) return `+9${only}`;
  if (only.length === 10) return `+90${only}`;
  return digits.startsWith("+") ? digits : `+${only}`;
}

function stableId(name: string, phone: string): string {
  const base = `${name.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim()}|${phone}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  return `tavily:${(h >>> 0).toString(36)}`;
}

/** Gemini ile arama sonuçlarından işletme kayıtları çıkarır. */
async function extractBusinesses(
  results: TavilyResult[],
  locationHint: string,
): Promise<z.infer<typeof ExtractedSchema>["businesses"]> {
  if (results.length === 0) return [];
  const corpus = results
    .map(
      (r, i) =>
        `#${i + 1} ${r.title ?? ""}\n${r.url ?? ""}\n${(r.raw_content || r.content || "").slice(0, 3000)}`,
    )
    .join("\n\n---\n\n")
    .slice(0, 60000);

  const { object } = await generateObject({
    model: geminiProvider()(SUPPORT_CHAT_MODEL),
    schema: ExtractedSchema,
    system:
      "Aşağıdaki web arama sonuçlarından TÜRKİYE'deki oto tamir/sanayi işletmelerini çıkar. " +
      "Sadece metinde AÇIKÇA geçen işletmeleri döndür; telefon numarası veya adres uydurma. " +
      "Telefonu ve adresi olmayan kayıtları atla. Aynı işletmeyi tekrarlama.",
    prompt: `Aranan bölge: ${locationHint}\n\nArama sonuçları:\n${corpus}`,
  });
  return object.businesses;
}

/** OpenStreetMap Nominatim ile adresten koordinat bulur (anahtarsız, nazik kullanım). */
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(address)}`,
      { headers: { "User-Agent": "AutoSocial/1.0 (mechanic-directory)" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = json[0];
    if (!first?.lat || !first?.lon) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch {
    return null;
  }
}

async function geocodeAll(rows: ImportedMechanic[]): Promise<void> {
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i += 3) {
    const batch = rows.slice(i, i + 3);
    await Promise.all(
      batch.map(async (r) => {
        const point = await geocode(`${r.address}, ${r.city}, Türkiye`);
        if (point) {
          r.lat = point.lat;
          r.lng = point.lng;
        }
      }),
    );
  }
}

/**
 * Verilen sorgular için Tavily araması yapar, sonuçları `mechanics` satırlarına dönüştürür.
 * `locationHint` sorguya eklenen şehir/bölge etiketidir (ör. "Ankara, Çankaya").
 */
export async function searchMechanicsWithTavily(opts: {
  queries: string[];
  locationHint: string;
  maxResultsPerQuery?: number;
}): Promise<ImportedMechanic[]> {
  if (opts.queries.length === 0) return [];
  const maxResults = opts.maxResultsPerQuery ?? 10;

  const searches = await Promise.all(
    opts.queries.map((q) =>
      tavilySearch(`${q} ${opts.locationHint} telefon adres`.trim(), maxResults).catch(() => []),
    ),
  );
  const results = searches.flat();
  const extracted = await extractBusinesses(results, opts.locationHint);

  const seen = new Set<string>();
  const rows: ImportedMechanic[] = [];
  for (const b of extracted) {
    const phone = normalizePhone(b.phone ?? "");
    const name = (b.business_name ?? "").trim();
    const address = (b.address ?? "").trim();
    if (!phone || !name || address.length < 5) continue;
    const external_id = stableId(name, phone);
    if (seen.has(external_id)) continue;
    seen.add(external_id);
    rows.push({
      business_name: name,
      phone,
      address,
      city: (b.city || "").trim() || guessCityFromText(address) || opts.locationHint,
      district: b.district?.trim() || null,
      lat: null,
      lng: null,
      avg_rating: 0,
      rating_count: 0,
      external_id,
    });
  }

  await geocodeAll(rows);
  return rows;
}

/** lat/lng için en yakın şehir etiketini bulur (Nominatim ters geokodlama). */
export async function reverseGeocodeLabel(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&lat=${lat}&lon=${lng}`,
      { headers: { "User-Agent": "AutoSocial/1.0 (mechanic-directory)" } },
    );
    if (!res.ok) return "Türkiye";
    const json = (await res.json()) as {
      address?: { province?: string; state?: string; city?: string; town?: string; county?: string; suburb?: string };
    };
    const a = json.address ?? {};
    const province = a.province || a.state || a.city || "";
    const district = a.county || a.town || a.suburb || "";
    const label = [province, district].filter(Boolean).join(", ");
    return label || "Türkiye";
  } catch {
    return "Türkiye";
  }
}
