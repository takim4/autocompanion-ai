
# AutoSocial — Aşamalı Teslim Planı

Tam kapsam (21 ekran, 27 tablo, 6 AI ajanı, RAG) tek turda derlenebilir kalitede üretilemez. Bu yüzden kararlı bir mimari iskelet + tabakalı teslim önerdim. Her faz kendi başına derlenir, çalışır ve preview'da doğrulanabilir; sonraki faz onun üzerine eklenir.

## Mimari Kararlar (Sabit)

- **Stack:** TanStack Start (mevcut), React 19, Vite 7, Tailwind v4, shadcn/ui, Framer Motion, Lucide.
- **State:** TanStack Query v5 (server state) + Zustand (UI/global client state).
- **Backend:** Lovable Cloud (Supabase managed) — Auth, Postgres, RLS, Storage, `pgvector`.
- **AI:** Lovable AI Gateway (embeddings + LLM). Embedding: `google/gemini-embedding-001` (varsayılan; brief'teki `text-embedding-3-small` yerine — 3-small allowlist'te ama Gemini default). LLM: `google/gemini-3-flash-preview`. AI SDK + `@ai-sdk/openai-compatible` üzerinden.
- **Auth:** Supabase managed (email/password + Google). JWT lifecycle Supabase tarafından yönetilir (brief'teki 15dk/7g manuel döngü yerine — güvenli varsayılan).
- **Routes:** `src/routes/` file-based. Auth-gated ekranlar `_authenticated/` altında.
- **Roles:** Ayrı `user_roles` tablo + `app_role` enum + `has_role()` SECURITY DEFINER.
- **Docker/FastAPI/Prisma/Redis:** brief'te var ama Lovable Cloud stack'inde gereksiz → **kapsam dışı** (Supabase = Postgres+Auth+Storage, pgvector = vector DB, TanStack server functions = API). Docker istenirse ayrı turda eklerim.
- **Renk paleti** `src/styles.css` içinde `oklch` semantic token olarak (light + dark), hardcoded hex yok.

## Klasör Yapısı (TanStack'e Uyarlanmış)

Brief Next.js `src/app/` istiyor; TanStack'te karşılığı `src/routes/`. Kalan yapı korunur:

```text
src/
├── routes/            # file-based sayfalar + api/ server routes
├── components/        # ui/, layout/, form/
├── features/          # auth, garage, ai-chat, forum, marketplace, admin
├── hooks/             # useAuth, useRagQuery, useVehicles ...
├── lib/               # ai-gateway.server.ts, rag.server.ts, utils
├── integrations/supabase/  # (managed) client, client.server, auth-middleware
├── stores/            # zustand
├── types/
└── styles.css
```

## Veri Tabanı (27 Tablo → Fazlara Bölünmüş)

Tümü RLS + `GRANT`'li, gerekli indeksler + pgvector. Tablolar fazlara dağıtılır:

- **Faz 1 (Core):** `profiles`, `user_roles`, `vehicles`, `saved_vehicles`, `images`, `attachments`, `devices`, `api_keys`, `search_history`
- **Faz 2 (AI/RAG):** `knowledge_base` (vector(3072)), `tags`, `categories`, `questions_ai_answers`, `community_verifications`
- **Faz 3 (Community):** `conversations`, `messages`, `saved_posts`, `votes`, `reputation_history`, `reports`
- **Faz 4 (Mod/Gamification):** `audit_logs`, `moderation_logs`, `user_achievements`, `user_levels`
- **Faz 5 (Marketplace):** `verified_mechanics`, `affiliate_links`, `marketplace_orders`

`user_sessions` Supabase Auth tarafından yönetildiği için ayrı tablo açılmaz.

## 21 Ekran → Fazlara Dağılım

| Faz | Ekranlar |
|---|---|
| **1 — İskelet + Auth + Garaj** | 1 Splash · 2 Onboarding · 3 Login · 4 Register · 5 OAuth · 6 Forgot Password · 7 Araç Ekleme Sihirbazı · 8 Garajım · 9 Ana Sayfa (statik shell) · 19 Ayarlar (tema) |
| **2 — AI + RAG** | 10 AI Chat · 15 Soru & Çözüm Detay (AI yanıtı kısmı) · 9 Ana Sayfa AI kutusu canlı |
| **3 — Arama + Topluluk** | 11 Gelişmiş Arama · 12 Marka · 13 Model · 14 Forum · 15 tam (topluluk oylama) · 16 Profil · 18 Bildirimler |
| **4 — Gamification + Admin** | 17 Rozetler · 20 Admin · 21 Moderator |
| **5 — Marketplace** | Marketplace kartları, affiliate CTA'ları, onaylı usta eşleştirme |

## RAG Hattı (Faz 2)

- **Embedding:** `google/gemini-embedding-001` (3072-dim; brief'in `text-embedding-3-small`'u da desteklenir, kullanıcı isterse switch).
- **Chunking:** 512 karakter, 64 overlap (server-side helper).
- **Store:** `knowledge_base(embedding vector(3072))` + HNSW `halfvec` index.
- **Retrieve:** `match_knowledge()` SQL fn — cosine similarity + metadata filter (marka/model/kategori).
- **Rerank:** BGE-Reranker gerçek servis Lovable stack'te yok → **LLM-as-reranker** ile simüle (top-20 → LLM ile relevance skoru → top-5). Brief'teki Python kodu TS server-fn olarak yeniden yazılır.
- **Generation:** Top-5 chunk + user query → `streamText` (Gemini 3 Flash) → UI stream.

## 6 AI Ajanı (Faz 2-4, Orchestration)

TS server fn'leri olarak, sıralı/koşullu çağrılır (LangGraph gereksiz — basit orchestrator):

1. **Moderator** (Faz 2, giriş kapısı) — küfür/toxicity → `generateText` + kısa prompt
2. **Diagnostician** (Faz 2) — RAG + kullanıcı sorusu → arıza teşhisi
3. **Spam Detector** (Faz 3) — oylama sırasında IP + davranış heuristik + LLM
4. **Knowledge Curator** (Faz 3) — %80+ onaylı çözümü `knowledge_base`'e formatlayıp embed eder
5. **Community Summarizer** (Faz 3) — uzun thread → 3 madde özet
6. **Marketplace Recommender** (Faz 5) — teşhise göre parça + usta eşleştirme

## UX Standartları (Tüm Fazlar)

Her veri ekranında: Loading skeleton · Empty state · Error boundary + retry · Offline banner (`navigator.onLine` + Query retry). Ortak `<DataState>` wrapper `src/components/ui/data-state.tsx`.

## Test Stratejisi

- **Unit:** Vitest (utils, hooks, ajan orchestrator saf fn'leri)
- **E2E:** Playwright script'leri `/tmp/browser/` altında; auth flow + chat flow
- Her faz sonunda preview'da build + smoke test.

---

## Bu Turda Teslim (Faz 1 — İskelet)

Onay verirsen bu turda üretilecekler:

1. **Lovable Cloud enable** (Supabase provisioning).
2. **Migration #1** — Faz 1 tabloları (profiles, user_roles + `app_role` enum + `has_role`, vehicles, saved_vehicles, images, attachments, devices, api_keys, search_history) + RLS + GRANT'ler. `pgvector` extension enable (Faz 2'ye hazırlık).
3. **Design system:** `src/styles.css`'i AutoSocial paletiyle (light + dark oklch token'lar) güncelle. Framer Motion + Zustand + `@ai-sdk/*` bağımlılıkları.
4. **Layout:** `_authenticated/` gate, bottom nav (Garaj / Ana Sayfa / AI / Forum / Profil), tema toggle, top bar.
5. **Ekranlar 1-9 + 19:** Splash, Onboarding (3 kart), Login, Register, OAuth (Google), Forgot Password + `/reset-password`, Araç Ekleme Sihirbazı (multi-step: marka → model → yıl → km → motor), Garajım (grid + boş durum), Ana Sayfa (AI arıza kutusu placeholder + trend section shell), Ayarlar (profil + şifre + tema).
6. **Server fns:** vehicles CRUD (`requireSupabaseAuth`), profile update, auth attacher middleware.
7. **`__root.tsx`** — AutoSocial SEO metadata, `onAuthStateChange` root listener.
8. Build + preview smoke test.

Sonraki turlarda Faz 2 → 5 sırayla, her turda 3-5 ekran + ilgili tablolar + AI ajanları eklenir. Her faz kendi başına derlenir ve preview'da çalışır.

## Kapsam Dışı / Değiştirilen (Onayına Sunulur)

- ❌ Dockerfile / docker-compose / FastAPI / Prisma / Redis — Lovable Cloud'da gereksiz. İstenirse ayrı repo/tur.
- 🔄 Manuel JWT refresh döngüsü → Supabase managed (daha güvenli).
- 🔄 BGE-Reranker → LLM-as-reranker (Lovable Gateway'de BGE modeli yok).
- 🔄 `text-embedding-3-small` → `google/gemini-embedding-001` (default). İstersen 3-small'a çeviririm (`dimensions: 1536`).
- 🔄 Next.js App Router → TanStack Start file routes.

Onaylarsan Faz 1'i şimdi kodlamaya başlıyorum.
