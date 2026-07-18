## Amaç
Kullanıcı korumalı bir sayfaya (örn. `/garage`) girmeye çalışıp `/auth`'a yönlendirildiğinde, giriş yaptıktan sonra `/home`'a değil, **gitmek istediği sayfaya** dönmesini sağlamak.

## Şu anki davranış
- `_authenticated/route.tsx` → oturum yoksa `redirect({ to: "/auth" })` (hedef URL kaybediliyor).
- `auth.tsx` → login/register/Google başarılıysa her zaman `nav({ to: "/home" })`.

## Değişiklikler

### 1. `src/routes/_authenticated/route.tsx`
`beforeLoad` içinde mevcut `location.href`'i `redirect` search param olarak `/auth`'a taşı:
```ts
beforeLoad: async ({ location }) => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/auth", search: { redirect: location.href } });
  }
  return { user: data.user };
}
```

### 2. `src/routes/auth.tsx`
- `validateSearch` ile opsiyonel `redirect: string` param'ı tanımla (sadece same-origin göreli path'i kabul et, aksi halde `/home`'a düş — açık yönlendirme (open redirect) riskini önlemek için).
- `Route.useSearch()` ile `redirect` değerini oku.
- Login, Register ve Google OAuth başarı akışlarında `nav({ to: "/home" })` yerine güvenli `redirect` değerine git.
- Google OAuth için `redirect_uri`: `window.location.origin + safeRedirect` şeklinde kur (broker helper same-origin URL bekliyor).

### 3. `src/routes/index.tsx` (splash)
Değişiklik yok — oturumu olan kullanıcı zaten `/home`'a gidiyor; korumalı deep-link akışını `_authenticated` gate yakalıyor.

## Güvenlik notu
`redirect` param'ı yalnızca `/` ile başlayan ve `//` ile başlamayan string olduğunda kullanılacak; aksi halde `/home` fallback. Bu, harici URL'ye açık yönlendirmeyi engeller.

## Kapsam dışı
- Yeni ekran/tasarım eklenmiyor.
- Şifre sıfırlama akışı, onboarding ve iş mantığı dokunulmuyor.
