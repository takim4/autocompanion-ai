import { Link } from "@tanstack/react-router";
import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme-store";
import logoAsset from "@/assets/autosocial-logo.png.asset.json";

export function TopBar({ title }: { title?: string }) {
  const { theme, setTheme } = useThemeStore();
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur">
      <Link to="/forum" className="flex items-center gap-2">
        <img
          src={logoAsset.url}
          alt="AutoSocial"
          className="h-8 w-8 rounded-lg object-cover"
        />
        <span className="font-semibold tracking-tight">
          {title ?? "AutoSocial"}
        </span>
      </Link>
      <div className="flex items-center gap-1">
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
