import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type UploadBucket = "avatars" | "posts" | "communities";

/** Storage'a dosya yükler ve public URL döner. Yol öneki her zaman `${userId}/...` olmalı (RLS bunu zorunlu kılar). */
export async function uploadToBucket(
  bucket: UploadBucket,
  file: File,
  userId: string,
): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isImage && !isVideo) {
    throw new Error("Sadece resim veya video dosyaları yüklenebilir");
  }
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(`Dosya çok büyük (maks. ${Math.round(maxBytes / 1024 / 1024)} MB)`);
  }

  const ext =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
