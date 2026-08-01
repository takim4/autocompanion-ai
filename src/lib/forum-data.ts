// Statik keşif verisi — gönderiler/yorumlar artık forum.functions.ts üzerinden
// gerçek backend'den geliyor (bkz. forum_posts/forum_comments tabloları).

export const TREND_TOPICS = [
  { tag: "Turbo Arızası", count: 128 },
  { tag: "EV Şarj Sorunları", count: 94 },
  { tag: "Kış Lastiği", count: 76 },
  { tag: "P0301 Hata Kodu", count: 61 },
  { tag: "Şanzıman Bakımı", count: 44 },
] as const;
