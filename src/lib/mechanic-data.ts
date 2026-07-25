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

export type SupportStatus = "çözüldü" | "ön_çözüm_sunuldu" | "uzman_gerekli";

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  çözüldü: "✅ Çözüldü",
  ön_çözüm_sunuldu: "🔧 Ön çözüm sunuldu",
  uzman_gerekli: "🧑‍🔧 Uzman gerekli",
};

/** Destek Asistanı cevabından "**Durum:** uzman_gerekli" satırını parse eder. */
export function parseStatusFromAI(text: string): SupportStatus | null {
  const m = text.match(/\*\*Durum:?\*\*\s*([^\n]+)/i);
  if (!m) return null;
  const v = m[1].trim().toLowerCase();
  if (v.includes("uzman")) return "uzman_gerekli";
  if (v.includes("çözüldü")) return "çözüldü";
  if (v.includes("ön") && v.includes("çözüm")) return "ön_çözüm_sunuldu";
  return null;
}

export const TR_CITIES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Amasya",
  "Ankara",
  "Antalya",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkâri",
  "Hatay",
  "Isparta",
  "Mersin",
  "İstanbul",
  "İzmir",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Kahramanmaraş",
  "Mardin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Şanlıurfa",
  "Uşak",
  "Van",
  "Yozgat",
  "Zonguldak",
  "Aksaray",
  "Bayburt",
  "Karaman",
  "Kırıkkale",
  "Batman",
  "Şırnak",
  "Bartın",
  "Ardahan",
  "Iğdır",
  "Yalova",
  "Karabük",
  "Kilis",
  "Osmaniye",
  "Düzce",
] as const;

/** Haversine mesafesi (km) — Postgres tarafında hesaplandığı için client-side sadece format. */
export function formatDistanceKm(km: number | null | undefined): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export type VehicleForMessage = {
  brand: string;
  model: string;
  year: number;
  fuel?: string | null;
  transmission?: string | null;
  engine_cc?: number | null;
  engine_code?: string | null;
  mileage_km?: number | null;
  plate?: string | null;
};

/** AI cevabından "Olası Neden" ve "Önerilen Çözüm" bölümlerini kısaltarak çıkarır. */
export function extractDiagnosisSummary(text: string, maxLen = 500): string {
  if (!text) return "";
  const stripMd = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/^#+\s*/gm, "")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const sectionRe =
    /\*\*\s*(Olası Neden(?:ler)?|Önerilen Çözüm[^*]*|Çözüm[^*]*|Onarım Adımları)\s*:?\s*\*\*/gi;
  const matches = [...text.matchAll(sectionRe)];
  if (matches.length === 0) {
    return stripMd(text).slice(0, maxLen);
  }
  const parts: string[] = [];
  for (let i = 0; i < Math.min(matches.length, 2); i++) {
    const start = matches[i].index ?? 0;
    const end = matches[i + 1]?.index ?? text.length;
    parts.push(text.slice(start, end).trim());
  }
  return stripMd(parts.join("\n\n")).slice(0, maxLen);
}

function formatVehicleLine(v?: VehicleForMessage | null): string | null {
  if (!v) return null;
  const bits = [`${v.year} ${v.brand} ${v.model}`];
  const engine = [v.engine_cc ? `${v.engine_cc}cc` : null, v.engine_code ? v.engine_code : null]
    .filter(Boolean)
    .join(" ");
  if (engine) bits.push(engine);
  if (v.fuel) bits.push(v.fuel);
  if (v.transmission) bits.push(v.transmission);
  if (v.mileage_km) bits.push(`${v.mileage_km.toLocaleString("tr-TR")} km`);
  if (v.plate) bits.push(`Plaka: ${v.plate}`);
  return bits.join(" • ");
}

/** WhatsApp / iletişim şablonu — araç ve teşhis bilgileriyle kişiselleştirilir. */
export function buildMechanicMessage(opts: {
  businessName?: string;
  vehicle?: VehicleForMessage | null;
  diagnosis: string;
  specialties?: Specialty[];
}): string {
  const { businessName, vehicle, diagnosis, specialties } = opts;
  const lines: string[] = [];
  lines.push(
    businessName
      ? `Merhaba ${businessName}, AutoSocial üzerinden ulaşıyorum.`
      : "Merhaba, AutoSocial üzerinden ulaşıyorum.",
  );

  const vLine = formatVehicleLine(vehicle);
  if (vLine) {
    lines.push("");
    lines.push(`🚗 Aracım: ${vLine}`);
  }

  if (specialties && specialties.length > 0) {
    lines.push(`🔧 İlgili uzmanlık: ${specialties.map((s) => SPECIALTY_LABELS[s]).join(", ")}`);
  }

  const summary = extractDiagnosisSummary(diagnosis, 600);
  if (summary) {
    lines.push("");
    lines.push("📋 AI teşhis özeti:");
    lines.push(summary);
  }

  lines.push("");
  lines.push("Bu sorun için fiyat teklifi ve uygun randevu alabilir miyim?");
  return lines.join("\n");
}
