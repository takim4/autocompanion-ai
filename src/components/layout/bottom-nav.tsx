import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="safe-bottom sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-end justify-around px-2 pb-1.5 pt-2">
        {NAV_ITEMS.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          const isCenter = it.to === "/ai-chat";

          if (isCenter) {
            return (
              <li key={it.to} className="flex-1">
                <Link
                  to={it.to}
                  aria-label={it.label}
                  className="mx-auto flex flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "-mt-5 flex h-12 w-12 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-transparent bg-brand-gradient"
                        : "border-foreground/25 bg-background text-foreground",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "text-current")} />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {it.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {it.label}
                <span className={cn("h-[3px] w-[3px] rounded-full", active ? "bg-foreground" : "bg-transparent")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
