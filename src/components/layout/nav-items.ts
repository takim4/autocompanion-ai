import { MessageSquare, Users, User, Video } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/forum", label: "Forum", icon: Users },
  { to: "/feed", label: "Sosyal Medya", icon: Video },
  { to: "/ai-chat", label: "AI", icon: MessageSquare },
  { to: "/profile", label: "Hesap", icon: User },
] as const;
