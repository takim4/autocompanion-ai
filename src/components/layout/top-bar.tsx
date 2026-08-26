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
    <header className="glass-panel safe-top sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border px-4">
      <Link to="/forum" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand-gradient shadow-[0_8px_20px_-6px_hsl(var(--shadow-color)/0.7)]">
          <img src={logoAsset.url} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="font-display font-bold tracking-tight">{title ?? "AutoSocial"}</span>
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
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold transition-all lg:px-3.5 ${
                active
                  ? "bg-brand-gradient text-white shadow-[0_8px_20px_-8px_hsl(var(--shadow-color)/0.7)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
