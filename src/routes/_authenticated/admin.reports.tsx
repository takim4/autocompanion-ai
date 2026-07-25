import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { getMyRoles } from "@/lib/garage.functions";
import { listAdminReports, resolveReport } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReportsPage,
  head: () => ({ meta: [{ title: "Şikayet Kuyruğu — AutoSocial" }] }),
});

function AdminReportsPage() {
  const rolesFn = useServerFn(getMyRoles);
  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });

  if (rolesQ.isLoading) return <LoadingState />;
  if (!rolesQ.data?.includes("admin")) {
    return (
      <EmptyState
        title="Bu sayfa sadece uygulama adminlerine açık"
        description="Görüntülemek için admin yetkisi gerekiyor."
        icon={ShieldAlert}
      />
    );
  }
  return <ReportsQueue />;
}

function ReportsQueue() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "reviewing" | "resolved" | "dismissed" | undefined>(
    "open",
  );
  const listFn = useServerFn(listAdminReports);
  const resolveFn = useServerFn(resolveReport);
  const q = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => listFn({ data: { status } }),
  });

  const mut = useMutation({
    mutationFn: (vars: { id: string; status: "reviewing" | "resolved" | "dismissed" }) =>
      resolveFn({ data: { id: vars.id, status: vars.status } }),
    onSuccess: () => {
      toast.success("Şikayet güncellendi.");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ShieldAlert className="h-6 w-6" /> Şikayet Kuyruğu
      </h1>
      <p className="text-sm text-muted-foreground">
        Burada sadece genel (topluluk dışı) şikayetler ve topluluk adminlerinin eskale ettiği
        şikayetler görünür.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {(["open", "reviewing", "resolved", "dismissed", undefined] as const).map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === s
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            {s ?? "Tümü"}
          </button>
        ))}
      </div>

      {q.isLoading && <LoadingState />}
      {q.data && q.data.length === 0 && <EmptyState title="Bu durumda şikayet yok" />}

      <ul className="space-y-2">
        {(q.data ?? []).map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">
                {r.target_type} · {r.reason}{" "}
                {r.escalated && <span className="text-amber-600">(eskale edildi)</span>}
              </p>
              <span className="text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("tr-TR")}
              </span>
            </div>
            {r.details && <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Bildiren: {r.reporter_profile?.display_name ?? "Kullanıcı"} · Durum: {r.status}
            </p>
            {(r.status === "open" || r.status === "reviewing") && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => mut.mutate({ id: r.id, status: "resolved" })}
                >
                  Çözüldü
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => mut.mutate({ id: r.id, status: "dismissed" })}
                >
                  Reddet
                </Button>
              </div>
            )}
            {mut.isPending && <Loader2 className="mt-2 h-3 w-3 animate-spin" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
