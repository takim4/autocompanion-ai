import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Bu işlem için admin yetkisi gerekiyor");
}

export const listAllMechanicsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("mechanics")
      .select("id, business_name, address, city, district, lat, lng, verified, active")
      .order("business_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Bir ustanın adresini Google Geocoding API ile çözüp lat/lng'i günceller.
 * Önceden Apify ile toplanan/scrape edilen konum verisi hatalıydı (uzak
 * sonuçlar dönüyordu); bu, Lovable'a bağlanan Google Maps anahtarıyla
 * (GOOGLE_MAPS_API_KEY) düzeltmek için admin-only bir araçtır.
 */
export const geocodeMechanicLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ mechanic_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_MAPS_API_KEY tanımlı değil. Lovable > Settings > Environment Variables üzerinden Google Maps bağlantısının anahtarını ekleyin.",
      );
    }

    const { data: mechanic, error: fetchErr } = await context.supabase
      .from("mechanics")
      .select("id, address, city, district")
      .eq("id", data.mechanic_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!mechanic) throw new Error("Usta bulunamadı");

    const fullAddress = [mechanic.address, mechanic.district, mechanic.city, "Türkiye"]
      .filter(Boolean)
      .join(", ");

    const params = new URLSearchParams({
      address: fullAddress,
      key: apiKey,
      region: "tr",
      language: "tr",
    });
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );
    if (!res.ok) throw new Error(`Google Geocoding isteği başarısız: HTTP ${res.status}`);
    const json = (await res.json()) as {
      status: string;
      error_message?: string;
      results: {
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
      }[];
    };
    if (json.status !== "OK" || !json.results?.[0]) {
      throw new Error(
        `Google Geocoding sonuç vermedi (${json.status}${json.error_message ? ": " + json.error_message : ""}) — adres: "${fullAddress}"`,
      );
    }

    const { lat, lng } = json.results[0].geometry.location;
    const formatted_address = json.results[0].formatted_address;

    const { data: row, error: updateErr } = await context.supabase
      .from("mechanics")
      .update({ lat, lng })
      .eq("id", data.mechanic_id)
      .select("id, business_name, lat, lng")
      .single();
    if (updateErr) throw new Error(updateErr.message);

    return { ...row, formatted_address };
  });
