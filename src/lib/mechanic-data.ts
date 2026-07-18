export const SPECIALTIES = [
  "motor",
  "elektrik-elektronik",
  "kaporta-boya",
  "şanzıman",
  "fren-süspansiyon",
  "klima",
  "lastik-rot-balans",
  "egzoz",
  "genel bakım",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  motor: "Motor",
  "elektrik-elektronik": "Elektrik & Elektronik",
  "kaporta-boya": "Kaporta & Boya",
  şanzıman: "Şanzıman",
  "fren-süspansiyon": "Fren & Süspansiyon",
  klima: "Klima",
  "lastik-rot-balans": "Lastik & Rot Balans",
  egzoz: "Egzoz",
  "genel bakım": "Genel Bakım",
};

/** AI cevabından "**Uzmanlık:** motor, elektrik-elektronik" satırını parse eder. */
export function parseSpecialtiesFromAI(text: string): Specialty[] {
  const m = text.match(/\*\*Uzmanlık:?\*\*\s*([^\n]+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;/]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Specialty => (SPECIALTIES as readonly string[]).includes(s));
}

export const TR_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya",
  "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu",
  "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır",
  "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun",
  "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir",
  "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya",
  "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop",
  "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak",
  "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale",
  "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük",
  "Kilis", "Osmaniye", "Düzce",
] as const;

/** Haversine mesafesi (km) — Postgres tarafında hesaplandığı için client-side sadece format. */
export function formatDistanceKm(km: number | null | undefined): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
