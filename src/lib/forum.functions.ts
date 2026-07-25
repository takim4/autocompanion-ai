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

export const listForumCategories = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.from("forum_categories").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

const ListThreadsInput = z.object({
  category_id: z.string().uuid().optional().nullable(),
  community_id: z.string().uuid().optional().nullable(),
  status: z.enum(["open", "solved"]).optional(),
  author_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  before: z.string().datetime().optional(),
});

export const listForumThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListThreadsInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("forum_threads")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.community_id) {
      q = q.eq("community_id", data.community_id);
    } else {
      q = q.is("community_id", null);
      if (data.category_id) q = q.eq("category_id", data.category_id);
    }
    if (data.status) q = q.eq("status", data.status);
    if (data.author_id) q = q.eq("user_id", data.author_id);
    if (data.before) q = q.lt("created_at", data.before);

    const { data: rows, error } = await q;
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

export const getForumThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase
      .from("forum_threads")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) return null;

    await context.supabase.rpc("increment_thread_view", { _thread_id: data.id });

    const { data: replies, error: repliesErr } = await context.supabase
      .from("forum_replies")
      .select("*")
      .eq("thread_id", data.id)
      .order("created_at", { ascending: true });
    if (repliesErr) throw new Error(repliesErr.message);

    const userIds = [thread.user_id, ...(replies ?? []).map((r) => r.user_id)];
    const profileMap = await fetchProfileMap(context.supabase, userIds);

    const { data: myLike } = await context.supabase
      .from("likes")
      .select("id")
      .eq("user_id", context.userId)
      .eq("target_type", "forum_thread")
      .eq("target_id", data.id)
      .maybeSingle();
    const { data: mySave } = await context.supabase
      .from("saves")
      .select("id")
      .eq("user_id", context.userId)
      .eq("target_type", "forum_thread")
      .eq("target_id", data.id)
      .maybeSingle();

    return {
      ...thread,
      profile: profileMap.get(thread.user_id) ?? null,
      liked_by_me: !!myLike,
      saved_by_me: !!mySave,
      replies: (replies ?? []).map((r) => ({
        ...r,
        profile: profileMap.get(r.user_id) ?? null,
      })),
    };
  });

const CreateThreadInput = z.object({
  category_id: z.string().uuid().optional().nullable(),
  community_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(8000),
  vehicle_brand: z.string().max(60).optional().nullable(),
  vehicle_model: z.string().max(60).optional().nullable(),
});

export const createForumThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateThreadInput.parse(i))
  .handler(async ({ data, context }) => {
    if (!data.community_id && !data.category_id) {
      throw new Error("Bir kategori seçmelisiniz");
    }
    const { data: row, error } = await context.supabase
      .from("forum_threads")
      .insert({
        category_id: data.community_id ? null : (data.category_id ?? null),
        community_id: data.community_id ?? null,
        user_id: context.userId,
        title: data.title,
        body: data.body,
        vehicle_brand: data.vehicle_brand ?? null,
        vehicle_model: data.vehicle_model ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteForumThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("forum_threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const CreateReplyInput = z.object({
  thread_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
  parent_reply_id: z.string().uuid().optional().nullable(),
});

export const createForumReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateReplyInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("forum_replies")
      .insert({
        thread_id: data.thread_id,
        user_id: context.userId,
        body: data.body,
        parent_reply_id: data.parent_reply_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteForumReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("forum_replies")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markReplySolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ reply_id: z.string().uuid(), solved: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("mark_reply_solution", {
      _reply_id: data.reply_id,
      _solved: data.solved,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
