import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-[1.75rem] border border-border/60 bg-popover/90 px-2 py-2 shadow-[0_16px_40px_-16px_hsl(var(--shadow-color)/0.55)] backdrop-blur-xl">
        {NAV_ITEMS.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          const isCenter = it.to === "/ai-chat";

          if (isCenter) {
            return (
              <Link
                key={it.to}
                to={it.to}
                aria-label={it.label}
                className="relative -mt-6 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-brand-gradient text-white shadow-[0_10px_24px_-6px_hsl(var(--shadow-color)/0.7)] transition-transform active:scale-95"
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          }

          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
