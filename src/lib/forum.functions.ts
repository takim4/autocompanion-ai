import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { db } from "@/lib/untyped-supabase";

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

const PostInput = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1).max(30)).max(6).optional().default([]),
  media_url: z.string().url().max(2000).optional(),
  media_type: z.enum(["image", "video"]).optional(),
});

export const listForumPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: posts, error }, { data: liked }] = await Promise.all([
      db(context.supabase)
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      db(context.supabase).from("forum_post_likes").select("post_id").eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const likedIds = new Set((liked ?? []).map((r: { post_id: string }) => r.post_id));
    return (posts ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      liked_by_me: likedIds.has(p.id as string),
    }));
  });

export const getForumPost = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const [
      { data: post, error },
      { data: comments, error: cErr },
      { data: likedPost },
      { data: likedComments },
    ] = await Promise.all([
      db(context.supabase).from("forum_posts").select("*").eq("id", data.id).maybeSingle(),
      db(context.supabase)
        .from("forum_comments")
        .select("*")
        .eq("post_id", data.id)
        .order("created_at", { ascending: true }),
      db(context.supabase)
        .from("forum_post_likes")
        .select("post_id")
        .eq("user_id", context.userId)
        .eq("post_id", data.id)
        .maybeSingle(),
      db(context.supabase)
        .from("forum_comment_likes")
        .select("comment_id")
        .eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    if (cErr) throw new Error(cErr.message);
    if (!post) return null;
    const likedCommentIds = new Set(
      (likedComments ?? []).map((r: { comment_id: string }) => r.comment_id),
    );
    return {
      ...post,
      liked_by_me: !!likedPost,
      comments: (comments ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        liked_by_me: likedCommentIds.has(c.id as string),
      })),
    };
  });

export const createForumPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PostInput.parse(i))
  .handler(async ({ data, context }) => {
    const author = await authorSnapshot(context.supabase, context.userId);
    const { data: row, error } = await db(context.supabase)
      .from("forum_posts")
      .insert({ ...data, ...author, user_id: context.userId, source: "user" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const CommentInput = z.object({
  post_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export const createForumComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CommentInput.parse(i))
  .handler(async ({ data, context }) => {
    const author = await authorSnapshot(context.supabase, context.userId);
    const { data: row, error } = await db(context.supabase)
      .from("forum_comments")
      .insert({ ...data, ...author, user_id: context.userId, source: "user" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleForumPostLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ post_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const client = db(context.supabase);
    const { data: existing } = await client
      .from("forum_post_likes")
      .select("post_id")
      .eq("post_id", data.post_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await client
        .from("forum_post_likes")
        .delete()
        .eq("post_id", data.post_id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { liked: false };
    }
    const { error } = await client
      .from("forum_post_likes")
      .insert({ post_id: data.post_id, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const toggleForumCommentLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ comment_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const client = db(context.supabase);
    const { data: existing } = await client
      .from("forum_comment_likes")
      .select("comment_id")
      .eq("comment_id", data.comment_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await client
        .from("forum_comment_likes")
        .delete()
        .eq("comment_id", data.comment_id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { liked: false };
    }
    const { error } = await client
      .from("forum_comment_likes")
      .insert({ comment_id: data.comment_id, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ followee_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.followee_id === context.userId) throw new Error("Kendini takip edemezsin.");
    const client = db(context.supabase);
    const { data: existing } = await client
      .from("user_follows")
      .select("followee_id")
      .eq("follower_id", context.userId)
      .eq("followee_id", data.followee_id)
      .maybeSingle();
    if (existing) {
      const { error } = await client
        .from("user_follows")
        .delete()
        .eq("follower_id", context.userId)
        .eq("followee_id", data.followee_id);
      if (error) throw new Error(error.message);
      return { following: false };
    }
    const { error } = await client
      .from("user_follows")
      .insert({ follower_id: context.userId, followee_id: data.followee_id });
    if (error) throw new Error(error.message);
    return { following: true };
  });

export const listPostsByUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: posts, error } = await db(context.supabase)
      .from("forum_posts")
      .select("id, title, like_count, comment_count, created_at")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return posts ?? [];
  });

export const listFollowCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = db(context.supabase);
    const [{ data: profiles, error }, { data: following }] = await Promise.all([
      client
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      client.from("user_follows").select("followee_id").eq("follower_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const followingIds = new Set(
      (following ?? []).map((r: { followee_id: string }) => r.followee_id),
    );
    return (profiles ?? []).map(
      (p: {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }) => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        is_following: followingIds.has(p.id),
      }),
    );
  });
