import { z } from "zod";
import { embed, generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  geminiProvider,
  FACT_CHECK_MODEL,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  friendlyGeminiError,
} from "./gemini.server";
import { scrapeUrl, searchWeb } from "./firecrawl.server";
import type { Database } from "@/integrations/supabase/types";

/**
 * "Doğruluk Kontrolcüsü" (Fact-Checker) AI ajanı.
 * Araç teknik özellikleri, modifiye detayları veya forum girdilerini KANITA DAYALI (RAG +
 * web arama) olarak doğrular; şüpheli/yanlış iddiaları işaretler ve 0-1 arası güven skoru üretir.
 *
 * Forum ekibi için sözleşme: `runFactCheck` sonucundaki `score` 0.7'nin altındaysa gönderi
 * engellenmelidir (bkz. `src/lib/fact-check.functions.ts` → `checkText`, `passed` alanı).
 */

export const FactCheckResultSchema = z.object({
  score: z.number().min(0).max(1).describe("0-1 arası doğruluk skoru, 1 = tamamen doğru/kanıtlı"),
  summary: z.string().describe("1-2 cümlelik genel değerlendirme, Türkçe"),
  flagged_claims: z.array(
    z.object({
      claim: z.string().describe("Metindeki sorunlu iddianın kendisi"),
      issue: z.string().describe("Neden yanlış/şüpheli olduğu"),
      correction: z.string().describe("Doğrusu / önerilen düzeltme"),
      confidence: z.number().min(0).max(1),
    }),
  ),
  sources_referenced: z.array(z.string()).describe("Değerlendirmede kullanılan kaynak başlıkları"),
});
export type FactCheckResult = z.infer<typeof FactCheckResultSchema>;

export type FactCheckSource = { title: string; url: string | null };

const FACT_CHECKER_SYSTEM_PROMPT = `Sen AutoSocial platformunun "Doğruluk Kontrolcüsü" (Fact-Checker) AI ajanısın.
Rolün: Araç teknik özellikleri, modifiye/tuning detayları veya forum girdilerindeki iddiaları kanıta dayalı olarak doğrulamak ve yanlış bilgiyi işaretlemek.

Kurallar:
- Sana verilen "KAYNAKLAR" bölümündeki bilgiyi ve kendi güvenilir teknik bilgini kullan.
- Kaynaklarla çelişen, abartılı, kanıtsız veya güvenlik riski oluşturan (fren, süspansiyon, elektrik, yangın riski vb.) iddiaları "flagged_claims" içine yaz.
- Her flagged claim için: iddianın tam metni, neden yanlış/şüpheli olduğu, doğrusu ve ne kadar emin olduğun (confidence 0-1).
- score: metnin GENELİNİN ne kadar doğru olduğu — 0 tamamen yanlış, 1 tamamen doğru/kanıtlı.
- Kaynak bulunamayan ama makul genel bakım tavsiyeleri veya kişisel deneyim paylaşımları için skoru gereksiz düşürme; sadece somut, çürütülebilir teknik iddiaları (rakamlar, tork değerleri, parça uyumluluğu, güvenlik) sıkı denetle.
- Emin olamadığın iddialar için confidence'ı düşük tut, körü körüne "yanlış" damgalama.
- Cevabın SADECE verilen JSON şemasına uygun olmalı.`;

type GroundingSource = { title: string; url: string | null; content: string };

function buildSourcesBlock(sources: GroundingSource[]): string {
  if (sources.length === 0)
    return "(Harici/iç kaynak bulunamadı — kendi güvenilir bilginle değerlendir.)";
  return sources
    .map(
      (s, i) =>
        `[Kaynak ${i + 1}] ${s.title}${s.url ? ` (${s.url})` : ""}\n${s.content.slice(0, 2000)}`,
    )
    .join("\n\n");
}

export async function runFactCheck(opts: {
  supabase: SupabaseClient<Database>;
  text: string;
  url?: string | null;
  contextLabel?: string | null;
}): Promise<{ result: FactCheckResult; sources: FactCheckSource[] }> {
  const gemini = geminiProvider();
  const sources: GroundingSource[] = [];

  // 1) RAG: iç bilgi tabanından (knowledge_chunks) benzer, doğrulanmış içerikleri çek
  try {
    const { embedding } = await embed({
      model: gemini.textEmbeddingModel(EMBEDDING_MODEL),
      value: opts.text,
      providerOptions: {
        google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: "RETRIEVAL_QUERY" },
      },
    });
    const { data: chunks } = await opts.supabase.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_count: 4,
    });
    for (const c of chunks ?? []) {
      sources.push({ title: c.title || c.source, url: c.url, content: c.content });
    }
  } catch {
    // İç bilgi tabanı opsiyonel bir sinyal — başarısız olursa sessizce devam edilir.
  }

  // 2) Firecrawl: bir kaynak URL verildiyse kazı, verilmediyse iddiayı web'de doğrula
  if (opts.url) {
    const scraped = await scrapeUrl(opts.url);
    if (scraped) sources.push(scraped);
  } else {
    const found = await searchWeb(opts.text.slice(0, 200), 2);
    sources.push(...found);
  }

  const prompt = [
    opts.contextLabel ? `BAĞLAM: ${opts.contextLabel}` : null,
    `DEĞERLENDİRİLECEK METİN:\n${opts.text}`,
    `\nKAYNAKLAR:\n${buildSourcesBlock(sources)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { object } = await generateObject({
      model: gemini(FACT_CHECK_MODEL),
      schema: FactCheckResultSchema,
      system: FACT_CHECKER_SYSTEM_PROMPT,
      prompt,
    });
    return {
      result: object,
      sources: sources.map((s) => ({ title: s.title, url: s.url })),
    };
  } catch (e) {
    throw friendlyGeminiError(e, "Doğrulama üretilemedi");
  }
}
