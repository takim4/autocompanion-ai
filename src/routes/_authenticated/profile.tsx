import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, User } from "lucide-react";
import { LoadingState } from "@/components/data-state";
import { getMyProfile } from "@/lib/garage.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profil — AutoSocial" }] }),
});

function ProfilePage() {
  const fn = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["me"], queryFn: () => fn() });

  if (q.isLoading) return <LoadingState />;
  const p = q.data;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {p?.display_name ?? "Kullanıcı"}
            </h1>
            {p?.username && (
              <p className="text-sm text-muted-foreground">@{p.username}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-semibold text-accent-foreground">
            <Award className="h-4 w-4" />
            {p?.reputation ?? 0}
          </div>
        </div>
        {p?.bio && (
          <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>
        )}
      </div>
    </div>
  );
}
