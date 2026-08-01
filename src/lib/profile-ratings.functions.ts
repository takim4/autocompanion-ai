import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { db } from "@/lib/untyped-supabase";

export const getPublicProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const client = db(context.supabase);
    const [{ data: profile, error }, { data: following }, { data: myRating }] = await Promise.all([
      client
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, reputation, avg_rating, rating_count, created_at",
        )
        .eq("id", data.id)
        .maybeSingle(),
      client
        .from("user_follows")
        .select("followee_id")
        .eq("follower_id", context.userId)
        .eq("followee_id", data.id)
        .maybeSingle(),
      client
        .from("profile_ratings")
        .select("rating")
        .eq("rater_id", context.userId)
        .eq("profile_id", data.id)
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    if (!profile) return null;
    return {
      ...profile,
      is_self: data.id === context.userId,
      is_following: !!following,
      my_rating: myRating?.rating ?? null,
    };
  });

const RateInput = z.object({
  profile_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
});

export const rateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RateInput.parse(i))
  .handler(async ({ data, context }) => {
    if (data.profile_id === context.userId) throw new Error("Kendi profilini puanlayamazsın.");
    const { error } = await db(context.supabase)
      .from("profile_ratings")
      .upsert(
        { rater_id: context.userId, profile_id: data.profile_id, rating: data.rating },
        { onConflict: "rater_id,profile_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeProfileRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ profile_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await db(context.supabase)
      .from("profile_ratings")
      .delete()
      .eq("rater_id", context.userId)
      .eq("profile_id", data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
