import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, ChevronRight, FileText, User, Wrench } from "lucide-react";
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
    <div className="mx-auto max-w-2xl space-y-4">
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

      <div className="grid gap-2">
        <ProfileLink
          to="/quotes"
          icon={<FileText className="h-4 w-4" />}
          title="Tekliflerim"
          desc="Ustalara gönderdiğin teklif istekleri ve gelen cevaplar."
        />
        <ProfileLink
          to="/mechanic-panel"
          icon={<Wrench className="h-4 w-4" />}
          title="Usta Paneli"
          desc="Ustaysan işletme profilini yönet, teklifleri cevapla."
        />
      </div>
    </div>
  );
}

function ProfileLink({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/30"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

