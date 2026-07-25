import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createReport, REPORT_REASON_LABELS } from "@/lib/reports.functions";

type ReportTargetType =
  | "post"
  | "forum_thread"
  | "forum_reply"
  | "comment"
  | "community"
  | "community_message"
  | "mechanic"
  | "user";

type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "nudity"
  | "misinformation"
  | "scam"
  | "illegal"
  | "other";

export function ReportDialog({
  targetType,
  targetId,
  communityId,
  trigger,
}: {
  targetType: ReportTargetType;
  targetId: string;
  communityId?: string | null;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const fn = useServerFn(createReport);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          target_type: targetType,
          target_id: targetId,
          community_id: communityId ?? null,
          reason,
          details: details.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Şikayetiniz iletildi.");
      setOpen(false);
      setDetails("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Flag className="h-3.5 w-3.5" /> Şikayet et
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>İçeriği şikayet et</DialogTitle>
          <DialogDescription>
            {communityId
              ? "Bu şikayet topluluğun yöneticilerine iletilir. Gerekirse onlar uygulama adminlerine iletebilir."
              : "Bu şikayet uygulama adminlerine iletilir."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Sebep</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Açıklama (opsiyonel)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Detay ekleyin…"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Şikayet gönder
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
