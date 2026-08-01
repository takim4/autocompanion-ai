import { supabase } from "@/integrations/supabase/client";

export type UploadedMedia = { url: string; type: "image" | "video" };

/**
 * Doğrudan tarayıcıdan Supabase Storage'a yükler (server function üzerinden
 * ikili veri proxy'lemek yerine) — `user-media` bucket'ının RLS politikası
 * yolun ilk klasörünün auth.uid() olmasını şart koşuyor.
 */
export async function uploadUserMedia(
  file: File,
  folder: "forum" | "social",
): Promise<UploadedMedia> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Bu işlem için oturum açman gerekiyor.");

  const ext = file.name.includes(".") ? file.name.split(".").pop() : file.type.split("/")[1] || "bin";
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("user-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data: pub } = supabase.storage.from("user-media").getPublicUrl(path);
  return { url: pub.publicUrl, type: file.type.startsWith("video") ? "video" : "image" };
}
