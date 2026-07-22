import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const logInput = z.object({
  mechanic_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable().optional(),
  conversation_id: z.string().uuid().nullable().optional(),
  phone: z.string().min(1).max(40),
  message: z.string().min(1).max(4000),
  diagnosis_snapshot: z.string().max(8000).nullable().optional(),
  specialties: z.array(z.string()).default([]),
});

export const logWhatsappMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof logInput>) => logInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("whatsapp_messages")
      .insert({
        user_id: userId,
        mechanic_id: data.mechanic_id,
        vehicle_id: data.vehicle_id ?? null,
        conversation_id: data.conversation_id ?? null,
        phone: data.phone,
        message: data.message,
        diagnosis_snapshot: data.diagnosis_snapshot ?? null,
        specialties: data.specialties ?? [],
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listWhatsappMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select(
        "id, mechanic_id, vehicle_id, conversation_id, phone, message, diagnosis_snapshot, specialties, created_at, mechanics(business_name, city, district, phone, whatsapp)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const deleteInput = z.object({ id: z.string().uuid() });

export const deleteWhatsappMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof deleteInput>) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("whatsapp_messages")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
