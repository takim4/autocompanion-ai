/**
 * Apify "Google Maps Scraper" (compass/crawler-google-places) entegrasyonu.
 * `mechanics` tablosunu gerçek oto tamircisi/sanayi verisiyle doldurmak için kullanılır.
 * Server-only — APIFY_API_TOKEN gerektirir.
 */

const APIFY_ACTOR = "compass~crawler-google-places";

type ApifyPlace = {
  title?: string;
  address?: string;
  city?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  location?: { lat?: number; lng?: number };
  placeId?: string;
  totalScore?: number;
  reviewsCount?: number;
  categoryName?: string;
};

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

/** Apify actor'ünü senkron çalıştırır ve dataset satırlarını döner. */
export async function scrapeGoogleMapsPlaces(opts: {
  query: string;
  city: string;
  limit?: number;
}): Promise<ApifyPlace[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN eksik. Ortam değişkenlerine ekleyin.");

  const searchString = `${opts.query} ${opts.city}`.trim();
  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [searchString],
        maxCrawledPlacesPerSearch: opts.limit ?? 20,
        language: "tr",
        countryCode: "tr",
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apify isteği başarısız (${res.status}): ${text.slice(0, 300)}`);
  }
  const items = (await res.json()) as ApifyPlace[];
  return Array.isArray(items) ? items : [];
}

/** Ham Apify sonucunu `mechanics` tablosu satırına dönüştürür; telefon/adres eksikse atlar. */
export function toMechanicRows(places: ApifyPlace[], fallbackCity: string): ImportedMechanic[] {
  const rows: ImportedMechanic[] = [];
  for (const p of places) {
    const phone = (p.phone || p.phoneUnformatted || "").trim();
    const businessName = (p.title || "").trim();
    const address = (p.address || "").trim();
    if (!phone || !businessName || !address || !p.placeId) continue;
    rows.push({
      business_name: businessName,
      phone,
      address,
      city: p.city || fallbackCity,
      district: null,
      lat: p.location?.lat ?? null,
      lng: p.location?.lng ?? null,
      avg_rating: p.totalScore ?? 0,
      rating_count: p.reviewsCount ?? 0,
      external_id: p.placeId,
    });
  }
  return rows;
}
