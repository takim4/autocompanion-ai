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
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link to="/forum" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-brand-gradient">
            <img src={logoAsset.url} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            {title ?? "AutoSocial"}
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-7 md:flex">
          {NAV_ITEMS.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                className="group relative py-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                style={active ? { color: "var(--foreground)" } : undefined}
              >
                {it.label}
                <span
                  className={`absolute -bottom-[1px] left-0 h-[1.5px] w-full origin-left scale-x-0 bg-foreground transition-transform duration-200 ${
                    active ? "scale-x-100" : "group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Tema" className="rounded-full">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Ayarlar" className="rounded-full">
            <Link to="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
