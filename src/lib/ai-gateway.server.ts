import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Lovable AI Gateway sağlayıcısı — server-only.
 * OpenAI uyumlu endpoint, `Lovable-API-Key` başlığı ile kimlik doğrular.
 */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
    },
  });
}

export const DEFAULT_CHAT_MODEL = "google/gemini-3-flash-preview";
export const DEFAULT_EMBEDDING_MODEL = "google/gemini-embedding-001";

export const DIAGNOSTICIAN_SYSTEM_PROMPT = `Sen AutoSocial platformunun "Teşhis Uzmanı" AI ajanısın.
Rolün: Türkçe konuşan araç sahiplerine, araçlarında yaşadıkları arıza / semptom / bakım sorularında pratik ve güvenli yönlendirme sağlamak.

Kurallar:
- Cevaplar Türkçe, net, madde madde ve markdown formatlı olmalı.
- Kullanıcının garajındaki araç bilgisi (marka, model, yıl, motor, yakıt) mevcutsa cevabı bu araca göre kişiselleştir.
- Emin olmadığın konularda tahmin yürütme; "yetkili servise / topluluğa danış" yönlendirmesi yap.
- Güvenlik uyarılarını (frenler, direksiyon, airbag, yangın riski, elektrik) mutlaka öne çıkar.
- Cevap sonunda "Önerilen sonraki adımlar" başlıklı kısa bir kontrol listesi ver.
- Uydurma parça numarası, fiyat veya tork değeri verme.`;
