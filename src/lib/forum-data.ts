// Forum backend henüz yok (Faz 3) — arayüz tasarımı için statik örnek veri.

export type ForumComment = {
  id: string;
  author: string;
  avatar: string;
  content: string;
  time: string;
  likes: number;
};

export type ForumPost = {
  id: string;
  title: string;
  tags: string[];
  author: string;
  avatar: string;
  excerpt: string;
  body: string;
  image: string;
  likes: number;
  commentCount: number;
  time: string;
  comments: ForumComment[];
};

export const TREND_TOPICS = [
  { tag: "Turbo Arızası", count: 128 },
  { tag: "EV Şarj Sorunları", count: 94 },
  { tag: "Kış Lastiği", count: 76 },
  { tag: "P0301 Hata Kodu", count: 61 },
  { tag: "Şanzıman Bakımı", count: 44 },
] as const;

export const FOLLOWED_USERS = [
  { id: "1", user: "usta_mehmet", avatar: "🛠️" },
  { id: "2", user: "garaj42", avatar: "🔧" },
  { id: "3", user: "bmwlife", avatar: "🚗" },
  { id: "4", user: "elektrikci_ali", avatar: "⚡" },
  { id: "5", user: "dieselking", avatar: "⛽" },
] as const;

export const FORUM_POSTS: ForumPost[] = [
  {
    id: "1",
    title: "Soğuk havada turbo sesi normal mi?",
    tags: ["Turbo", "Motor", "Kış"],
    author: "ahmet_gt",
    avatar: "🏎️",
    excerpt:
      "Sabah ilk çalıştırmada hafif ıslık sesi geliyor, 2 dakika sonra kayboluyor. Bu normal mi yoksa turboyu mu kontrol ettirmeliyim?",
    body:
      "Sabahları ilk çalıştırmada hafif bir ıslık sesi geliyor, motor ısındıktan yaklaşık 2 dakika sonra kayboluyor. Aracı 3 gündür bu şekilde kullanıyorum, performans kaybı hissetmiyorum ama sesi merak ettim. Turboyu servise götürmeden önce benzer bir şey yaşayan var mı?",
    image: "🌀",
    likes: 84,
    commentCount: 3,
    time: "2 sa",
    comments: [
      {
        id: "c1",
        author: "usta_mehmet",
        avatar: "🛠️",
        content:
          "Soğukta kısa süreli ıslık genelde turbo yataklarının henüz tam yağlanmamasından kaynaklanır, 2 dakikadan uzun sürüyorsa contaya baktır.",
        time: "1 sa",
        likes: 12,
      },
      {
        id: "c2",
        author: "dieselking",
        avatar: "⛽",
        content: "Bende de aynısı var, 60.000 km'de sorun çıkarmadı.",
        time: "45 dk",
        likes: 4,
      },
      {
        id: "c3",
        author: "garaj42",
        avatar: "🔧",
        content: "Emin olmak için basınç testi yaptırman en sağlıklısı.",
        time: "10 dk",
        likes: 2,
      },
    ],
  },
  {
    id: "2",
    title: "Turbo değişimi sonrası 60 saniyelik özet",
    tags: ["Tamir", "Turbo"],
    author: "usta_mehmet",
    avatar: "🛠️",
    excerpt: "Turbo değişimini adım adım anlattım, öncesi/sonrası fark inanılmaz.",
    body:
      "Turbo değişimini adım adım anlattım, öncesi/sonrası fark inanılmaz. Videoyu akışta bulabilirsiniz, burada sadece parça listesini paylaşıyorum.",
    image: "🔧",
    likes: 512,
    commentCount: 1,
    time: "5 sa",
    comments: [
      {
        id: "c1",
        author: "elektrikci_ali",
        avatar: "⚡",
        content: "Orijinal parça mı kullandın yoksa muadil mi?",
        time: "3 sa",
        likes: 6,
      },
    ],
  },
  {
    id: "3",
    title: "E46 restorasyonu bitti! Öncesi/sonrası",
    tags: ["Resto", "BMW"],
    author: "garaj42",
    avatar: "🔧",
    excerpt: "8 ay süren restorasyon sonunda tamamlandı, detaylar içeride.",
    body:
      "8 ay süren restorasyon sonunda tamamlandı. Kaporta, boya, iç döşeme ve süspansiyon yenilendi. Sorularınızı yanıtlamaktan mutluluk duyarım.",
    image: "😍",
    likes: 891,
    commentCount: 0,
    time: "1 gün",
    comments: [],
  },
];
