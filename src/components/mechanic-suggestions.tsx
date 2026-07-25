import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Phone, MessageCircle, Send, Star, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listNearbyMechanics,
  createQuoteRequest,
  importNearbyMechanicsFromGoogleMaps,
} from "@/lib/mechanics.functions";
import { listVehicles } from "@/lib/garage.functions";
import { logWhatsappMessage } from "@/lib/whatsapp-history.functions";

import {
  SPECIALTIES,
  SPECIALTY_LABELS,
  TR_CITIES,
  formatDistanceKm,
  buildMechanicMessage,
  type Specialty,
  type VehicleForMessage,
} from "@/lib/mechanic-data";


type Mechanic = {
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
  distance_km: number | null;
};

export function MechanicSuggestions({
  specialties,
  diagnosisSnapshot,
  conversationId,
  vehicleId,
}: {
  specialties: Specialty[];
  diagnosisSnapshot: string;
  conversationId: string;
  vehicleId?: string | null;
}) {
  const listFn = useServerFn(listNearbyMechanics);
  const importNearbyFn = useServerFn(importNearbyMechanicsFromGoogleMaps);
  const vehiclesFn = useServerFn(listVehicles);
  const queryClient = useQueryClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [manualCity, setManualCity] = useState<string | null>(null);
  const [askingLocation, setAskingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const autoTriedRef = useRef(false);
  const importTriedRef = useRef<Set<string>>(new Set());

  const effectiveCity = manualCity;

  const vehiclesQ = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesFn(),
    enabled: !!vehicleId,
    staleTime: 60_000,
  });

  const vehicle = useMemo<VehicleForMessage | null>(() => {
    if (!vehicleId || !vehiclesQ.data) return null;
    const v = vehiclesQ.data.find((x: { id: string }) => x.id === vehicleId);
    return (v as VehicleForMessage | undefined) ?? null;
  }, [vehicleId, vehiclesQ.data]);

  const listQ = useQuery({
    queryKey: [
      "nearby-mechanics",
      { specialties, coords, city: effectiveCity },
    ],
    queryFn: () =>
      listFn({
        data: {
          specialties,
          lat: coords?.lat,
          lng: coords?.lng,
          city: coords ? null : effectiveCity,
          limit: 5,
        },
      }),
    enabled: !!(coords || effectiveCity),
  });

  const importMut = useMutation({
    mutationFn: (c: { lat: number; lng: number }) =>
      importNearbyFn({
        data: {
          specialties,
          lat: c.lat,
          lng: c.lng,
          limit: 5,
        },
      }),
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`${result.imported} yakın usta Google Maps üzerinden eklendi.`);
      }
      queryClient.invalidateQueries({ queryKey: ["nearby-mechanics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!coords || listQ.isLoading || listQ.isFetching || importMut.isPending) return;
    const results = (listQ.data ?? []) as Mechanic[];
    const hasEnoughNearby = results.filter((m) => m.distance_km != null && m.distance_km <= 25).length >= 3;
    if (hasEnoughNearby) return;
    const key = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}:${specialties.join("|")}`;
    if (importTriedRef.current.has(key)) return;
    importTriedRef.current.add(key);
    importMut.mutate(coords);
  }, [coords, specialties, listQ.data, listQ.isFetching, listQ.isLoading, importMut]);


  const requestLocation = (silent = false) => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tarayıcın konum desteklemiyor.");
      if (!silent) toast.error("Tarayıcın konum desteklemiyor, şehir seçebilirsin.");
      return;
    }
    setAskingLocation(true);
    setGeoError(null);

    let best: { lat: number; lng: number; acc: number } | null = null;
    let finished = false;

    const finish = (err?: GeolocationPositionError) => {
      if (finished) return;
      finished = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timeoutId);
      setAskingLocation(false);
      if (best) {
        const c = { lat: best.lat, lng: best.lng };
        setCoords(c);
        setAccuracy(best.acc);

        if (best.acc > 500 && !silent) {
          toast.info(`Konum kabaca alındı (±${Math.round(best.acc)} m). Daha net için 'Değiştir' → tekrar dene.`);
        }
        return;
      }
      const msg =
        err?.code === err?.PERMISSION_DENIED
          ? "Konum izni reddedildi. Tarayıcı adres çubuğundaki 🔒 simgesinden izin verebilir ya da aşağıdan şehir seçebilirsin."
          : err?.code === err?.POSITION_UNAVAILABLE
            ? "Konum alınamadı (sinyal yok). Şehir seçerek devam edebilirsin."
            : "Konum zaman aşımına uğradı. Şehir seçerek devam edebilirsin.";
      setGeoError(msg);
      if (!silent) toast.info(msg);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        if (!best || acc < best.acc) {
          best = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc };
        }
        // Yeterince doğru bir fix alındıysa erken tamamla
        if (best.acc <= 50) finish();
      },
      (err) => finish(err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
    const timeoutId = setTimeout(() => finish(), 12000);
  };


  // Sohbet açıldığında otomatik olarak net konumu iste (kullanıcı butona basmak zorunda kalmasın)
  useEffect(() => {
    if (autoTriedRef.current) return;
    if (coords || effectiveCity) return;
    autoTriedRef.current = true;
    requestLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-foreground">
          🔧 Bu sorunu çözebilecek yakındaki ustalar
        </div>
        <div className="flex flex-wrap gap-1">
          {specialties.map((s) => (
            <span
              key={s}
              className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {SPECIALTY_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      {!coords && !effectiveCity && (
        <div className="space-y-2 rounded-md border border-dashed border-border bg-card p-3">
          {geoError && (
            <div className="flex items-start gap-1.5 rounded bg-destructive/10 p-2 text-[11px] text-destructive">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => requestLocation(false)}
              disabled={askingLocation}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {askingLocation ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
              {askingLocation ? "Konum alınıyor…" : "Net konumumu kullan"}
            </button>
            <span className="text-[11px] text-muted-foreground">veya şehir seç:</span>
            <CitySelect value={null} onChange={(v) => setManualCity(v)} />
          </div>
        </div>
      )}

      {(coords || effectiveCity) && (
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {coords
              ? `📍 Net konumuna göre sıralandı${accuracy ? ` (±${Math.round(accuracy)} m)` : ""}`
              : `📍 Şehir: ${effectiveCity}`}
          </span>
          <button
            onClick={() => {
              setCoords(null);
              setManualCity(null);
              setAccuracy(null);
              autoTriedRef.current = false;
              importTriedRef.current.clear();
              requestLocation(false);
            }}

            className="hover:text-foreground"
          >
            Değiştir
          </button>
        </div>
      )}

      {(listQ.isLoading || importMut.isPending) && (coords || effectiveCity) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yakındaki ustalar Google Maps / Apify ile aranıyor…
        </div>
      )}

      {listQ.isError && (
        <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{listQ.error instanceof Error ? listQ.error.message : "Yakındaki ustalar getirilemedi."}</span>
        </div>
      )}

      {listQ.data && listQ.data.length === 0 && !importMut.isPending && (
        <div className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
          Bu bölgede uygun uzmanlıkta doğrulanmış usta bulunamadı. Konumu tekrar almayı veya farklı bir şehir seçmeyi dene.
        </div>
      )}

      <div className="space-y-2">
        {((listQ.data ?? []) as Mechanic[]).map((m) => (
          <MechanicCard
            key={m.id}
            mechanic={m as Mechanic}
            diagnosisSnapshot={diagnosisSnapshot}
            conversationId={conversationId}
            vehicleId={vehicleId}
            vehicle={vehicle}
            specialties={specialties}
          />
        ))}
      </div>
    </div>
  );
}

function MechanicCard({
  mechanic: m,
  diagnosisSnapshot,
  conversationId,
  vehicleId,
  vehicle,
  specialties,
}: {
  mechanic: Mechanic;
  diagnosisSnapshot: string;
  conversationId: string;
  vehicleId?: string | null;
  vehicle?: VehicleForMessage | null;
  specialties: Specialty[];
}) {
  const [openQuote, setOpenQuote] = useState(false);
  const message = buildMechanicMessage({
    businessName: m.business_name,
    vehicle,
    diagnosis: diagnosisSnapshot,
    specialties,
  });
  const waText = encodeURIComponent(message);

  const cleanPhone = m.phone.replace(/[^\d+]/g, "");
  const cleanWa = (m.whatsapp ?? m.phone).replace(/[^\d+]/g, "").replace(/^\+/, "");

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold">{m.business_name}</h4>
            {m.avg_rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {m.avg_rating.toFixed(1)} ({m.rating_count})
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {m.district ? `${m.district}, ` : ""}
            {m.city}
            {m.distance_km != null && (
              <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                {formatDistanceKm(m.distance_km)}
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {m.specialties.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] text-accent-foreground"
              >
                {SPECIALTY_LABELS[s as Specialty] ?? s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <a
          href={`tel:${cleanPhone}`}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium hover:bg-secondary/80"
        >
          <Phone className="h-3 w-3" /> Ara
        </a>
        <a
          href={`https://wa.me/${cleanWa}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void logWhatsappMessage({
              data: {
                mechanic_id: m.id,
                vehicle_id: vehicleId ?? null,
                conversation_id: conversationId,
                phone: m.whatsapp ?? m.phone,
                message,
                diagnosis_snapshot: diagnosisSnapshot,
                specialties,
              },
            }).catch(() => {});
          }}
          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700"
        >
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </a>
        <button
          onClick={() => setOpenQuote(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-3 w-3" /> Teklif iste
        </button>
      </div>

      {openQuote && (
        <QuoteRequestForm
          mechanic={m}
          conversationId={conversationId}
          vehicleId={vehicleId}
          diagnosisSnapshot={diagnosisSnapshot}
          onClose={() => setOpenQuote(false)}
        />
      )}
    </div>
  );
}

function QuoteRequestForm({
  mechanic: m,
  conversationId,
  vehicleId,
  diagnosisSnapshot,
  onClose,
}: {
  mechanic: Mechanic;
  conversationId: string;
  vehicleId?: string | null;
  diagnosisSnapshot: string;
  onClose: () => void;
}) {
  const [issue, setIssue] = useState(diagnosisSnapshot.slice(0, 500));
  const [contact, setContact] = useState<"in_app" | "phone" | "whatsapp">("in_app");
  const fn = useServerFn(createQuoteRequest);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          mechanic_id: m.id,
          conversation_id: conversationId,
          vehicle_id: vehicleId ?? null,
          issue_summary: issue,
          diagnosis_snapshot: diagnosisSnapshot,
          preferred_contact: contact,
        },
      }),
    onSuccess: () => {
      toast.success("Teklif isteği gönderildi.");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Teklif iste — {m.business_name}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mb-1 block text-[11px] font-medium">Sorun özeti</label>
        <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          rows={5}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <label className="mb-1 mt-2 block text-[11px] font-medium">
          Tercih ettiğin iletişim
        </label>
        <div className="flex gap-1">
          {(
            [
              ["in_app", "Uygulama içi"],
              ["phone", "Telefon"],
              ["whatsapp", "WhatsApp"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setContact(v)}
              className={`flex-1 rounded-md border px-2 py-1 text-[11px] ${
                contact === v
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
          >
            İptal
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || issue.trim().length < 5}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

function CitySelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Şehir seç…</option>
      {TR_CITIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

const cacheKey = (id: string) => `autosocial:loc:${id}`;
function readCached(id: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; ts?: number };
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number" || !parsed.ts) return null;
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}
function writeCached(id: string, c: { lat: number; lng: number }) {
  try {
    sessionStorage.setItem(cacheKey(id), JSON.stringify({ ...c, ts: Date.now() }));
  } catch {
    // ignore
  }
}
function clearCached(id: string) {
  try {
    sessionStorage.removeItem(cacheKey(id));
  } catch {
    // ignore
  }
}

// Suppress unused variable
export const _SPECIALTIES = SPECIALTIES;
