import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, Settings, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/autosocial-logo.png.asset.json";

/**
 * Desktop/tablet primary navigation — a fixed-left instrument rail instead
 * of a horizontal top bar. Numbered stops, cut-corner active state, always
 * a dark ink surface regardless of the app theme (same treatment as the
 * hero panels) so it reads as a constant fixture, not a themed panel.
 */
export function AppRail() {
  const { theme, setTheme } = useThemeStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-w)] flex-col items-center justify-between bg-brand-gradient py-5 md:flex"
    >
      <div className="flex flex-col items-center gap-8">
        <Link to="/forum" className="flex h-11 w-11 items-center justify-center overflow-hidden bg-white/10 cut-sm">
          <img src={logoAsset.url} alt="AutoSocial" className="h-full w-full object-cover" />
        </Link>

        <nav className="flex flex-col items-center gap-1">
          {NAV_ITEMS.map((it, i) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                title={it.label}
                className={cn(
                  "group flex w-16 flex-col items-center gap-1 py-2.5 text-[9px] font-semibold uppercase tracking-wider transition-colors cut-sm",
                  active ? "bg-white/12 text-white" : "text-white/40 hover:text-white/80",
                )}
              >
                <span className="text-[9px] font-mono text-white/30">{String(i + 1).padStart(2, "0")}</span>
                <Icon className="h-4.5 w-4.5" />
                <span className="leading-none">{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          onClick={toggle}
          aria-label="Tema"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Link
          to="/settings"
          aria-label="Ayarlar"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}
