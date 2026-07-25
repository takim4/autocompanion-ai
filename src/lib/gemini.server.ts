import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Doğrudan Google Gemini API sağlayıcısı — server-only.
 * Lovable AI Gateway'e bağımlı değildir, kullanıcının kendi ücretsiz Gemini API key'ini kullanır.
 */
export function geminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY eksik. Ortam değişkenlerine ekleyin.");
  return createGoogleGenerativeAI({ apiKey });
}

export const SUPPORT_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-flash-latest";
export const FACT_CHECK_MODEL = process.env.GEMINI_FACT_CHECK_MODEL || "gemini-flash-latest";
export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

/** Gemini API hatalarını kullanıcıya gösterilebilir Türkçe mesaja çevirir. */
export function friendlyGeminiError(e: unknown, fallback: string): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (
    msg.includes("429") ||
    msg.toLowerCase().includes("quota") ||
    msg.toLowerCase().includes("rate limit")
  ) {
    return new Error("Gemini API kotası doldu, lütfen biraz sonra tekrar deneyin.");
  }
  if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("api key")) {
    return new Error("Gemini API key geçersiz veya eksik.");
  }
  return new Error(`${fallback}: ${msg}`);
}
