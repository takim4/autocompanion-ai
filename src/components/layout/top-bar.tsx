import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme-store";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import logoAsset from "@/assets/autosocial-logo.png.asset.json";

export function TopBar({ title }: { title?: string }) {
  const { theme, setTheme } = useThemeStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur">
      <Link to="/forum" className="flex shrink-0 items-center gap-2">
        <img
          src={logoAsset.url}
          alt="AutoSocial"
          className="h-8 w-8 rounded-lg object-cover"
        />
        <span className="font-semibold tracking-tight">
          {title ?? "AutoSocial"}
        </span>
      </Link>

      {/* Tablette sadece ikon, masaüstünde (lg+) ikon+etiket — alt sekmelerin yerini alır */}
      <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
        {NAV_ITEMS.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              title={it.label}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors lg:px-3 ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Tema">
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" asChild aria-label="Ayarlar">
          <Link to="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
