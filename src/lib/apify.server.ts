/**
 * Apify "Google Maps Scraper" (compass/crawler-google-places) entegrasyonu.
 * `mechanics` tablosunu gerçek oto tamircisi/sanayi verisiyle doldurmak için kullanılır.
 * Server-only — APIFY_API_TOKEN gerektirir.
 *
 * Sonuç sayısına yapay bir üst sınır KOYULMAZ — actor'a maxCrawledPlacesPerSearch
 * gönderilmez, Google Maps o arama için ne kadar sonuç veriyorsa hepsi çekilir.
 * Aynı çağrıda birden çok şehir/arama terimi taranabilir (searchStringsArray).
 */
import { TR_CITIES } from "./mechanic-data";

const APIFY_ACTOR = "compass~crawler-google-places";

type ApifyPlace = {
  title?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
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

type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
  radiusKm: number;
};

/** Apify actor'ünü senkron çalıştırır ve dataset satırlarını döner. */
export async function scrapeGoogleMapsPlaces(opts: {
  queries: string[];
  customGeolocation?: GeoPoint;
  maxPlacesPerSearch?: number;
}): Promise<ApifyPlace[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN eksik. Ortam değişkenlerine ekleyin.");
  if (opts.queries.length === 0) return [];

  const body: Record<string, unknown> = {
    searchStringsArray: opts.queries,
    language: "tr",
    countryCode: "tr",
    scrapePlaceDetailPage: true,
    scrapeReviewsPersonalData: false,
    maxImages: 0,
  };
  if (opts.customGeolocation) body.customGeolocation = opts.customGeolocation;
  if (opts.maxPlacesPerSearch) body.maxCrawledPlacesPerSearch = opts.maxPlacesPerSearch;

  const res = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apify isteği başarısız (${res.status}): ${text.slice(0, 300)}`);
  }
  const items = (await res.json()) as ApifyPlace[];
  return Array.isArray(items) ? items : [];
}

/** Adres metninden bilinen bir TR ili yakalamayı dener (p.city boşsa fallback). */
function guessCityFromAddress(address: string): string | null {
  const lower = address.toLocaleLowerCase("tr-TR");
  for (const city of TR_CITIES) {
    if (lower.includes(city.toLocaleLowerCase("tr-TR"))) return city;
  }
  return null;
}

/** Ham Apify sonucunu `mechanics` tablosu satırına dönüştürür; telefon/adres eksikse atlar. */
export function toMechanicRows(places: ApifyPlace[]): ImportedMechanic[] {
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
      city: p.city || guessCityFromAddress(address) || "Konuma yakın",
      district: p.neighborhood ?? null,
      lat: p.location?.lat ?? null,
      lng: p.location?.lng ?? null,
      avg_rating: p.totalScore ?? 0,
      rating_count: p.reviewsCount ?? 0,
      external_id: p.placeId,
    });
  }
  return rows;
}
