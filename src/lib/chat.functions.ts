import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, title, agent, vehicle_id, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const [conv, msgs] = await Promise.all([
      context.supabase
        .from("conversations")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", data.id)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true }),
    ]);
    if (conv.error) throw new Error(conv.error.message);
    if (msgs.error) throw new Error(msgs.error.message);
    return { conversation: conv.data, messages: msgs.data ?? [] };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().max(120).optional(),
        vehicle_id: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("conversations")
      .insert({
        user_id: context.userId,
        title: data.title ?? "Yeni sohbet",
        vehicle_id: data.vehicle_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SendMessageInput = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

/**
 * Kullanıcı mesajını kaydeder, AI cevabını üretir ve kaydeder.
 * Streaming değil (basit request/response) — UI polling yerine tek çağrıda döner.
 */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SendMessageInput.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY eksik");

    // Konuşma sahipliği kontrolü + araç bağlamı
    const { data: conv, error: convErr } = await context.supabase
      .from("conversations")
      .select("id, vehicle_id, title")
      .eq("id", data.conversation_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (convErr) throw new Error(convErr.message);
    if (!conv) throw new Error("Sohbet bulunamadı");

    let vehicleContext = "";
    if (conv.vehicle_id) {
      const { data: v } = await context.supabase
        .from("vehicles")
        .select("brand, model, year, fuel, transmission, engine_cc, engine_code, mileage_km")
        .eq("id", conv.vehicle_id)
        .maybeSingle();
      if (v) {
        vehicleContext = `\n\nKullanıcının aracı: ${v.year} ${v.brand} ${v.model}` +
          (v.engine_cc ? ` ${v.engine_cc}cc` : "") +
          (v.engine_code ? ` (${v.engine_code})` : "") +
          (v.fuel ? `, yakıt: ${v.fuel}` : "") +
          (v.transmission ? `, şanzıman: ${v.transmission}` : "") +
          (v.mileage_km ? `, ${v.mileage_km} km` : "");
      }
    }

    // Geçmiş mesajları çek
    const { data: history, error: histErr } = await context.supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", data.conversation_id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(40);
    if (histErr) throw new Error(histErr.message);

    // Kullanıcı mesajını kaydet
    const { error: insErr } = await context.supabase.from("messages").insert({
      conversation_id: data.conversation_id,
      user_id: context.userId,
      role: "user",
      content: data.content,
    });
    if (insErr) throw new Error(insErr.message);

    const { createLovableAiGatewayProvider, DEFAULT_CHAT_MODEL, DIAGNOSTICIAN_SYSTEM_PROMPT } =
      await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway(DEFAULT_CHAT_MODEL);

    try {
      const { text } = await generateText({
        model,
        system: DIAGNOSTICIAN_SYSTEM_PROMPT + vehicleContext,
        messages: [
          ...(history ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: data.content },
        ],
      });

      const { data: assistantRow, error: aErr } = await context.supabase
        .from("messages")
        .insert({
          conversation_id: data.conversation_id,
          user_id: context.userId,
          role: "assistant",
          content: text,
        })
        .select("id, role, content, created_at")
        .single();
      if (aErr) throw new Error(aErr.message);

      // Konuşma başlığı ilk mesajdan otomatik türet
      if ((history?.length ?? 0) === 0 && conv.title === "Yeni sohbet") {
        const autoTitle = data.content.slice(0, 60);
        await context.supabase
          .from("conversations")
          .update({ title: autoTitle })
          .eq("id", data.conversation_id);
      } else {
        await context.supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", data.conversation_id);
      }

      return { assistant: assistantRow };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("AI kotası doldu, lütfen biraz sonra tekrar deneyin.");
      if (msg.includes("402"))
        throw new Error("Lovable AI kredisi tükendi. Workspace ayarlarından kredi yükleyin.");
      throw new Error("AI cevabı üretilemedi: " + msg);
    }
  });
