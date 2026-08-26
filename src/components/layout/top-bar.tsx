import { Link } from "@tanstack/react-router";
import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme-store";
import logoAsset from "@/assets/autosocial-logo.png.asset.json";

/**
 * Mobile-only identity strip. On md+ the AppRail (fixed left) takes over
 * navigation entirely, so this bar carries just the mark and quick actions.
 */
export function TopBar({ title }: { title?: string }) {
  const { theme, setTheme } = useThemeStore();
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="safe-top sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
      <Link to="/forum" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden bg-brand-gradient cut-sm">
          <img src={logoAsset.url} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">{title ?? "AutoSocial"}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-0.5">
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
