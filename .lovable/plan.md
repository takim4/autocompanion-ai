# AI Teşhis → Çözüm → Usta Eşleştirme + Teklif

Sohbet cevabına "çözüm" ve "yakındaki uygun ustalar" katmanı ekleyip, ustaların uygulama içi profil sahibi olduğu ve iki farklı iletişim yolu (direkt/uygulama içi) sunulan bir modül kuracağız.

## 1. Veritabanı (tek migration)

**Enum & rol:**
- `app_role` enum'una `'mechanic'` değeri eklenecek.

**`public.mechanics`** — usta işletme profili
- `id`, `user_id` (auth.users), `business_name`, `owner_name`
- `phone`, `whatsapp` (E.164), `email`
- `address`, `city`, `district`, `lat`, `lng`
- `specialties text[]` (motor, elektrik-elektronik, kaporta-boya, şanzıman, fren-süspansiyon, klima, lastik-rot-balans, egzoz, genel bakım)
- `brands text[]` (uzmanlaştığı markalar; boş = tümü)
- `bio`, `hours jsonb`, `verified boolean`, `active boolean`
- `avg_rating`, `rating_count`
- RLS: herkes `active=true AND verified=true` olanı okur (profil kartı için `anon+authenticated` SELECT); usta kendi satırını tüm alanlarla yönetir; adminler tümünü yönetir.

**`public.quote_requests`** — kullanıcıdan ustaya teklif isteği
- `id`, `user_id`, `mechanic_id`, `vehicle_id` (opsiyonel), `conversation_id` (opsiyonel)
- `issue_summary text`, `diagnosis_snapshot text` (AI cevabından kısa özet)
- `preferred_contact` (in_app | phone | whatsapp)
- `status` (pending, quoted, accepted, declined, closed)
- RLS: sadece istek sahibi ve hedef usta görebilir/güncelleyebilir.

**`public.quote_responses`** — ustadan cevap
- `id`, `request_id`, `mechanic_id`
- `price_min`, `price_max`, `currency default 'TRY'`
- `message`, `eta_days`, `parts_included boolean`
- RLS: request sahibi ve cevabı yazan usta erişebilir.

Tümü RLS + GRANT + `updated_at` trigger'lı.

## 2. AI Teşhis Uzmanı promptu güncellemesi

`DIAGNOSTICIAN_SYSTEM_PROMPT` yeniden yazılacak — cevap her zaman şu bölümleri içerecek:

1. **Olası Neden(ler)** (öncelik sırasına göre)
2. **Önerilen Çözüm / Onarım Adımları**
3. **Tahmini Zorluk & Süre** (kolay/orta/zor, ~saat)
4. **Uygun Usta Uzmanlığı** — sabit anahtar kelime listesinden 1-3 tanesi seçilecek (motor, elektrik-elektronik, kaporta-boya, şanzıman, fren-süspansiyon, klima, lastik-rot-balans, egzoz, genel bakım) → UI bu anahtar kelimelerle usta filtreleyecek.
5. **Güvenlik Uyarısı** (varsa)

Anahtar kelimeler `**Uzmanlık:** motor, elektrik-elektronik` gibi net bir satırda dönecek; frontend regex ile parse edip filtrelemede kullanacak.

## 3. Server functions (`src/lib/mechanics.functions.ts`)

- `listNearbyMechanics({ lat?, lng?, city?, specialties?, brand?, limit=20 })` — koordinat varsa Haversine formülüyle SQL'de mesafe hesaplar, yoksa `city` eşleşmesiyle döner. Sadece `verified & active`.
- `getMechanic({ id })`
- `createQuoteRequest({ mechanic_id, vehicle_id?, conversation_id?, issue_summary, diagnosis_snapshot, preferred_contact })`
- `listMyQuoteRequests()` — kullanıcı gönderdiklerini
- `listIncomingQuoteRequests()` — usta kendisine gelenleri (rol kontrolü)
- `respondQuote({ request_id, price_min, price_max, message, eta_days })` — has_role('mechanic')
- `upsertMechanicProfile(...)` — sadece kendi profilini

## 4. UI değişiklikleri

**`ai-chat.tsx` ChatWindow:**
- Assistant mesajının altında AI cevabından `**Uzmanlık:**` satırı parse edilirse "🔧 Yakındaki ustalar" paneli açılır.
- Panel:
  - Konum: önce `navigator.geolocation.getCurrentPosition()` sorulur; reddedilirse/mevcut değilse profilden `city` çekilir, o da yoksa şehir seçme dropdown'u gösterilir (81 il).
  - Mesafeye/şehre göre 5 kart: işletme adı, uzmanlıklar chip'leri, mesafe (km), rating, `Ara`, `WhatsApp`, `Teklif iste` butonları.
  - `Ara` → `tel:` link, `WhatsApp` → `https://wa.me/<num>?text=<önceden doldurulmuş mesaj>`, `Teklif iste` → küçük modal → `createQuoteRequest`.
- Konum bilgisi sohbet ID'ye göre `sessionStorage`'da cache'lenir.

**Yeni rotalar (`_authenticated/`):**
- `mechanics.index.tsx` — genel usta arama (dışarıdan da erişilebilir liste)
- `mechanics.$id.tsx` — usta profil detay + tüm butonlar
- `quotes.index.tsx` — kullanıcı: gönderdiğim teklif istekleri + gelen cevaplar (accordion)
- `mechanic-panel.index.tsx` — sadece `mechanic` rolü: profil düzenleme + gelen istekler + cevap formu
  - `beforeLoad`: rol yoksa `/mechanic-panel/onboarding`'e yönlendir
- `mechanic-panel.onboarding.tsx` — kullanıcı "Usta olarak kayıt ol" derse profil oluştur (verified=false; admin onayı beklenir; MVP'de auto-approve on)

**Alt navigasyon:** "Teklifler" sekmesi eklenmeyecek (5 slot dolu); `profile.tsx` içine "Tekliflerim" ve "Usta paneli" kartları eklenecek.

## 5. Güvenlik & doğrulama

- Zod: telefon `+?\d{10,15}`, koordinatlar `-90..90 / -180..180`, `specialties` sabit enum listesinden.
- WhatsApp / tel link'lerinde `encodeURIComponent`.
- `mechanics.email` PII değil (işletme e-postası) ama yine de sadece verified profiller anon SELECT'e açık.
- Teklif oluşturma: aynı kullanıcı-usta çifti için 24 saatte 1 istek (server-side kontrol).

## 6. MVP kısıtı (bu iterasyonda dahil DEĞİL)

- Ödeme / komisyon
- Gerçek zamanlı mesajlaşma (usta ↔ kullanıcı)
- Fotoğraf ekleme teklif isteğine
- Admin onay paneli (verified auto-true; sonraki fazda toggle)

Bu kısıtlar Faz 3/4 sırasında açılacak.

## Teknik ekler

- `car-data.ts` yanına `mechanic-specialties.ts` ve `tr-cities.ts` (81 il) ekleyeceğim.
- Haversine SQL fonksiyonu ya da `earthdistance` extension yerine basit `(6371 * acos(...))` inline hesap — küçük tablo için yeterli.
- Migration onaylandıktan **sonra** kod yazılacak (Supabase types regenerate olacak).

Onay verirsen migration'ı gönderiyorum; ardından server functions + UI'ı sırayla yazacağım.