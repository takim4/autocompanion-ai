import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { AppRail } from "@/components/layout/app-rail";
import { BottomNav } from "@/components/layout/bottom-nav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background md:pl-[var(--rail-w)]">
      <AppRail />
      <TopBar />
      <main className="flex-1 pb-20 md:pb-10">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-10 md:py-10">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
