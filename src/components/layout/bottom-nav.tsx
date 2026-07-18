import { Link, useRouterState } from "@tanstack/react-router";
import { Car, Home, MessageSquare, Users, User } from "lucide-react";

const items = [
  { to: "/garage", label: "Garaj", icon: Car },
  { to: "/home", label: "Ana Sayfa", icon: Home },
  { to: "/ai-chat", label: "AI", icon: MessageSquare },
  { to: "/forum", label: "Forum", icon: Users },
  { to: "/profile", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className="flex items-center justify-around">
        {items.map((it) => {
          const active =
            pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
