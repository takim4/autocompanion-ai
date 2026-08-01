import { createFileRoute, redirect } from "@tanstack/react-router";

// Ana Sayfa artık bağımsız bir sekme değil — 4 ana ekran Forum, Sosyal Medya,
// AI ve Hesap. Eski /home bağlantıları Forum'a yönlendirilir.
export const Route = createFileRoute("/_authenticated/home")({
  beforeLoad: () => {
    throw redirect({ to: "/forum" });
  },
});
