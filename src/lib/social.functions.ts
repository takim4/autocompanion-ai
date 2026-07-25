import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const EngagementTarget = z.enum(["post", "forum_thread", "forum_reply", "comment"]);

// ============ Takip ============

export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("Kendinizi takip edemezsiniz");
    const { error } = await context.supabase
      .from("follows")
      .insert({ follower_id: context.userId, following_id: data.user_id });
    if (error && error.code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("follows")
      .delete()
      .eq("follower_id", context.userId)
      .eq("following_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, reputation, follower_count, following_count, post_count",
      )
      .eq("id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return null;

    const { data: followRow } = await context.supabase
      .from("follows")
      .select("id")
      .eq("follower_id", context.userId)
      .eq("following_id", data.user_id)
      .maybeSingle();

    return { ...profile, is_following: !!followRow, is_self: data.user_id === context.userId };
  });

export const listFollowers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return await attachProfiles(context.supabase, rows ?? [], "follower_id");
  });

export const listFollowing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("follows")
      .select("following_id, created_at")
      .eq("follower_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return await attachProfiles(context.supabase, rows ?? [], "following_id");
  });

const SearchProfilesInput = z.object({
  q: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export const searchProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SearchProfilesInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, follower_count, post_count")
      .neq("id", context.userId)
      .order("follower_count", { ascending: false })
      .limit(data.limit);
    if (data.q) {
      q = q.or(`username.ilike.%${data.q}%,display_name.ilike.%${data.q}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    let followingSet = new Set<string>();
    if (ids.length > 0) {
      const { data: mine } = await context.supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", context.userId)
        .in("following_id", ids);
      followingSet = new Set((mine ?? []).map((m) => m.following_id));
    }
    return (rows ?? []).map((r) => ({ ...r, is_following: followingSet.has(r.id) }));
  });

// ============ Gönderiler ============

const CreatePostInput = z.object({
  type: z.enum(["text", "image", "video"]),
  caption: z.string().max(2200).optional().nullable(),
  media_urls: z.array(z.string().url()).max(10).optional().default([]),
  tag: z.string().max(40).optional().nullable(),
  vehicle_id: z.string().uuid().optional().nullable(),
});

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreatePostInput.parse(i))
  .handler(async ({ data, context }) => {
    if (data.type !== "text" && data.media_urls.length === 0) {
      throw new Error("Foto/video gönderisi için en az bir medya gerekli");
    }
    const { data: row, error } = await context.supabase
      .from("posts")
      .insert({
        user_id: context.userId,
        type: data.type,
        caption: data.caption ?? null,
        media_urls: data.media_urls,
        tag: data.tag ?? null,
        vehicle_id: data.vehicle_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ListFeedInput = z.object({
  type: z.enum(["all", "image", "video", "live"]).optional().default("all"),
  author_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  before: z.string().datetime().optional(),
});

export const listFeedPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListFeedInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.type === "live") {
      q = q.eq("type", "live").is("live_ended_at", null);
    } else if (data.type !== "all") {
      q = q.eq("type", data.type);
    }
    if (data.author_id) q = q.eq("user_id", data.author_id);
    if (data.before) q = q.lt("created_at", data.before);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return await enrichPosts(context.supabase, context.userId, rows ?? []);
  });

export const listLivePosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("posts")
      .select("*")
      .eq("type", "live")
      .is("live_ended_at", null)
      .order("live_started_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return await enrichPosts(context.supabase, context.userId, rows ?? []);
  });

const StartLiveInput = z.object({ title: z.string().min(2).max(140) });

export const startLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StartLiveInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("posts")
      .select("id")
      .eq("user_id", context.userId)
      .eq("type", "live")
      .is("live_ended_at", null)
      .maybeSingle();
    if (existing) throw new Error("Zaten devam eden bir canlı yayınınız var");

    const { data: row, error } = await context.supabase
      .from("posts")
      .insert({
        user_id: context.userId,
        type: "live",
        live_title: data.title,
        live_started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const endLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .update({ live_ended_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Beğeni / Kaydetme (forum + sosyal ortak) ============

const TargetInput = z.object({ target_type: EngagementTarget, target_id: z.string().uuid() });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => TargetInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("likes")
      .select("id")
      .eq("user_id", context.userId)
      .eq("target_type", data.target_type)
      .eq("target_id", data.target_id)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase.from("likes").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { liked: false };
    }
    const { error } = await context.supabase.from("likes").insert({
      user_id: context.userId,
      target_type: data.target_type,
      target_id: data.target_id,
    });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => TargetInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("saves")
      .select("id")
      .eq("user_id", context.userId)
      .eq("target_type", data.target_type)
      .eq("target_id", data.target_id)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase.from("saves").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await context.supabase.from("saves").insert({
      user_id: context.userId,
      target_type: data.target_type,
      target_id: data.target_id,
    });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const listMySavedPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: saves, error } = await context.supabase
      .from("saves")
      .select("target_id, created_at")
      .eq("user_id", context.userId)
      .eq("target_type", "post")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    const ids = (saves ?? []).map((s) => s.target_id);
    if (ids.length === 0) return [];
    const { data: rows, error: postsErr } = await context.supabase
      .from("posts")
      .select("*")
      .in("id", ids);
    if (postsErr) throw new Error(postsErr.message);
    const enriched = await enrichPosts(context.supabase, context.userId, rows ?? []);
    const order = new Map(ids.map((id, idx) => [id, idx]));
    return enriched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  });

export const listMyLikedPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: likes, error } = await context.supabase
      .from("likes")
      .select("target_id, created_at")
      .eq("user_id", context.userId)
      .eq("target_type", "post")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    const ids = (likes ?? []).map((s) => s.target_id);
    if (ids.length === 0) return [];
    const { data: rows, error: postsErr } = await context.supabase
      .from("posts")
      .select("*")
      .in("id", ids);
    if (postsErr) throw new Error(postsErr.message);
    const enriched = await enrichPosts(context.supabase, context.userId, rows ?? []);
    const order = new Map(ids.map((id, idx) => [id, idx]));
    return enriched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  });

// ============ Yorumlar (forum + sosyal ortak) ============

const ListCommentsInput = z.object({ target_type: EngagementTarget, target_id: z.string().uuid() });

export const listComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListCommentsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("comments")
      .select("*")
      .eq("target_type", data.target_type)
      .eq("target_id", data.target_id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return await attachProfiles(context.supabase, rows ?? [], "user_id");
  });

const AddCommentInput = z.object({
  target_type: EngagementTarget,
  target_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  parent_comment_id: z.string().uuid().optional().nullable(),
});

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AddCommentInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("comments")
      .insert({
        user_id: context.userId,
        target_type: data.target_type,
        target_id: data.target_id,
        body: data.body,
        parent_comment_id: data.parent_comment_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("comments")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("comments")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ Yardımcılar ============
// PostgREST ilişki gömme (embed) kullanılmıyor: follows/posts/comments gibi tablolar
// auth.users'a referans veriyor, public.profiles'a değil — bu yüzden profil bilgisi
// ayrı bir sorguyla çekilip elle eşleniyor.

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

async function attachProfiles<T extends Record<string, unknown>>(
  supabase: SupabaseClient<Database>,
  rows: T[],
  key: keyof T,
) {
  const map = await fetchProfileMap(
    supabase,
    rows.map((r) => r[key] as string),
  );
  return rows.map((r) => ({ ...r, profile: map.get(r[key] as string) ?? null }));
}

async function enrichPosts(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  rows: ({ id: string; user_id: string } & Record<string, unknown>)[],
) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id as string);
  const profileMap = await fetchProfileMap(
    supabase,
    rows.map((r) => r.user_id as string),
  );
  const { data: myLikes } = await supabase
    .from("likes")
    .select("target_id")
    .eq("user_id", viewerId)
    .eq("target_type", "post")
    .in("target_id", ids);
  const { data: mySaves } = await supabase
    .from("saves")
    .select("target_id")
    .eq("user_id", viewerId)
    .eq("target_type", "post")
    .in("target_id", ids);
  const likedSet = new Set((myLikes ?? []).map((l: { target_id: string }) => l.target_id));
  const savedSet = new Set((mySaves ?? []).map((s: { target_id: string }) => s.target_id));

  return rows.map((r) => ({
    ...r,
    profile: profileMap.get(r.user_id as string) ?? null,
    liked_by_me: likedSet.has(r.id as string),
    saved_by_me: savedSet.has(r.id as string),
  }));
}
