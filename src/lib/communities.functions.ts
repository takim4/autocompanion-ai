import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type ProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

async function fetchProfileMap(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, ProfileLite>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", uniqueIds);
  return new Map((data ?? []).map((p: ProfileLite) => [p.id, p]));
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "topluluk";
}

// ============ Keşif / oluşturma ============

const ListCommunitiesInput = z.object({
  q: z.string().max(100).optional(),
  brand: z.string().max(60).optional(),
  limit: z.number().int().min(1).max(50).optional().default(30),
});

export const listCommunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListCommunitiesInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("communities")
      .select("*")
      .eq("status", "active")
      .order("member_count", { ascending: false })
      .limit(data.limit);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.brand) q = q.ilike("brand", data.brand);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    let myMemberships = new Map<string, { status: string; role: string }>();
    if (ids.length > 0) {
      const { data: mine } = await context.supabase
        .from("community_members")
        .select("community_id, status, role")
        .eq("user_id", context.userId)
        .in("community_id", ids);
      myMemberships = new Map(
        (mine ?? []).map((m) => [m.community_id, { status: m.status, role: m.role }]),
      );
    }

    return (rows ?? []).map((r) => ({
      ...r,
      my_membership: myMemberships.get(r.id) ?? null,
    }));
  });

export const getCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: community, error } = await context.supabase
      .from("communities")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!community) return null;

    const { data: membership } = await context.supabase
      .from("community_members")
      .select("*")
      .eq("community_id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: founder } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", community.founder_id)
      .maybeSingle();

    return { ...community, my_membership: membership ?? null, founder_profile: founder ?? null };
  });

const CreateCommunityInput = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(1000).optional().nullable(),
  brand: z.string().max(60).optional().nullable(),
  model: z.string().max(60).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  is_paid: z.boolean().optional().default(false),
  price_amount: z.number().min(1).max(1_000_000).optional().nullable(),
});

export const createCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateCommunityInput.parse(i))
  .handler(async ({ data, context }) => {
    if (data.is_paid && !data.price_amount) {
      throw new Error("Ücretli topluluk için bir fiyat belirtmelisiniz");
    }
    const base = slugify(data.name);
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: row, error } = await context.supabase
      .from("communities")
      .insert({
        slug,
        name: data.name,
        description: data.description ?? null,
        brand: data.brand ?? null,
        model: data.model ?? null,
        avatar_url: data.avatar_url ?? null,
        cover_url: data.cover_url ?? null,
        founder_id: context.userId,
        is_paid: data.is_paid,
        price_amount: data.is_paid ? data.price_amount : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const UpdateCommunityInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(1000).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
});

export const updateCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateCommunityInput.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("communities")
      .update(patch)
      .eq("id", id)
      .eq("founder_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyCommunityMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("community_members")
      .select("*, community:communities(*)")
      .eq("user_id", context.userId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ Üyelik yönetimi ============

const JoinInput = z.object({
  community_id: z.string().uuid(),
  message: z.string().max(500).optional().nullable(),
});

export const requestJoinCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => JoinInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("request_join_community", {
      _community_id: data.community_id,
      _message: data.message ?? null,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const leaveCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ community_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("community_members")
      .delete()
      .eq("community_id", data.community_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCommunityMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ community_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("community_members")
      .select("*")
      .eq("community_id", data.community_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const profileMap = await fetchProfileMap(
      context.supabase,
      (rows ?? []).map((r) => r.user_id),
    );
    return (rows ?? []).map((r) => ({
      ...r,
      profile: profileMap.get(r.user_id) ?? null,
    }));
  });

export const respondJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ member_id: z.string().uuid(), approve: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("respond_join_request", {
      _member_id: data.member_id,
      _approve: data.approve,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCommunityMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ member_id: z.string().uuid(), role: z.enum(["co_admin", "member"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_community_member_role", {
      _member_id: data.member_id,
      _role: data.role,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCommunityMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ member_id: z.string().uuid(), ban: z.boolean().optional().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("remove_community_member", {
      _member_id: data.member_id,
      _ban: data.ban,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markMemberPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ member_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("mark_member_paid", {
      _member_id: data.member_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Sohbet ============

const ListMessagesInput = z.object({
  community_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export const listCommunityMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListMessagesInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("community_messages")
      .select("*")
      .eq("community_id", data.community_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const profileMap = await fetchProfileMap(
      context.supabase,
      (rows ?? []).map((r) => r.user_id),
    );
    return (rows ?? [])
      .map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null }))
      .reverse();
  });

const SendMessageInput = z.object({
  community_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export const sendCommunityMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SendMessageInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("community_messages")
      .insert({ community_id: data.community_id, user_id: context.userId, body: data.body })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
