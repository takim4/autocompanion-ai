/**
 * Firecrawl entegrasyonu — Fact-Checker ajanının dış kaynaklardan (spec siteleri, forum
 * gönderileri) referans metin toplaması için. Key yoksa veya istek başarısız olursa boş
 * dizi döner; Fact-Checker bu durumda sadece iç bilgi tabanı + Gemini bilgisiyle çalışır.
 */

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

export type FirecrawlSource = {
  title: string;
  url: string;
  content: string;
};

function apiKey(): string | null {
  return process.env.FIRECRAWL_API_KEY || null;
}

/** Verilen URL'i temiz markdown metnine dönüştürür. */
export async function scrapeUrl(url: string): Promise<FirecrawlSource | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const markdown: string | undefined = json?.data?.markdown;
    if (!markdown) return null;
    return {
      title: json?.data?.metadata?.title || url,
      url,
      content: markdown.slice(0, 6000),
    };
  } catch {
    return null;
  }
}

/** Bir iddiayı doğrulamak için web'de arama yapıp en alakalı sonuçların içeriğini döner. */
export async function searchWeb(query: string, limit = 3): Promise<FirecrawlSource[]> {
  const key = apiKey();
  if (!key) return [];
  try {
    const res = await fetch(`${FIRECRAWL_BASE}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results: Array<Record<string, unknown>> = json?.data ?? [];
    return results
      .map((r) => ({
        title: (r.title as string) || (r.url as string) || "",
        url: (r.url as string) || "",
        content: ((r.markdown as string) || (r.description as string) || "").slice(0, 4000),
      }))
      .filter((r) => r.url && r.content);
  } catch {
    return [];
  }
}
