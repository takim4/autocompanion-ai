import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Bkz. forum.functions.ts — types.ts bu ortamda regenerate edilemediği için
// yeni tablolar (`social_posts` vb.) untyped client üzerinden okunuyor/yazılıyor.
function db(client: SupabaseClient<any>): SupabaseClient {
  return client as unknown as SupabaseClient;
}

async function authorSnapshot(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return {
    author_name: data?.display_name || data?.username || "Kullanıcı",
    author_avatar: data?.avatar_url || "🙂",
  };
}

async function withLikedByMe(client: SupabaseClient, userId: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id as string);
  const { data: liked } = await db(client)
    .from("social_post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", ids);
  const likedIds = new Set((liked ?? []).map((r: { post_id: string }) => r.post_id));
  return rows.map((r) => ({ ...r, liked_by_me: likedIds.has(r.id as string) }));
}

export const listReels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await db(context.supabase)
      .from("social_posts")
      .select("*")
      .eq("kind", "reel")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return withLikedByMe(context.supabase, context.userId, data ?? []);
  });

export const listStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await db(context.supabase)
      .from("social_posts")
      .select("*")
      .eq("kind", "story")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CreatePostInput = z.object({
  kind: z.enum(["reel", "story"]),
  media_url: z.string().url().max(2000),
  media_type: z.enum(["image", "video"]),
  caption: z.string().max(500).optional(),
  tag: z.string().max(30).optional(),
});

export const createSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreatePostInput.parse(i))
  .handler(async ({ data, context }) => {
    const author = await authorSnapshot(context.supabase, context.userId);
    const expires_at = data.kind === "story" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    const { data: row, error } = await db(context.supabase)
      .from("social_posts")
      .insert({ ...data, ...author, user_id: context.userId, source: "user", expires_at })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleSocialPostLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ post_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const client = db(context.supabase);
    const { data: existing } = await client
      .from("social_post_likes")
      .select("post_id")
      .eq("post_id", data.post_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await client
        .from("social_post_likes")
        .delete()
        .eq("post_id", data.post_id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { liked: false };
    }
    const { error } = await client
      .from("social_post_likes")
      .insert({ post_id: data.post_id, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { liked: true };
  });
