import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Eye, Heart, Loader2, MessageCircle, Pin, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createForumThread, listForumCategories, listForumThreads } from "@/lib/forum.functions";

export const Route = createFileRoute("/_authenticated/forum")({
  component: ForumPage,
  head: () => ({ meta: [{ title: "Forum — AutoSocial" }] }),
});

function ForumPage() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const categoriesFn = useServerFn(listForumCategories);
  const categoriesQ = useQuery({ queryKey: ["forum-categories"], queryFn: () => categoriesFn() });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" /> Topluluk Forumu
        </h1>
        <NewThreadDialog categories={categoriesQ.data ?? []} defaultCategoryId={categoryId} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategoryId(null)}
          className={`rounded-full border px-3 py-1 text-xs ${
            categoryId === null
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background hover:bg-accent"
          }`}
        >
          Tümü
        </button>
        {(categoriesQ.data ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              categoryId === c.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <ThreadList categoryId={categoryId} />
    </div>
  );
}

function ThreadList({ categoryId }: { categoryId: string | null }) {
  const fn = useServerFn(listForumThreads);
  const q = useQuery({
    queryKey: ["forum-threads", categoryId],
    queryFn: () => fn({ data: { category_id: categoryId } }),
  });

  if (q.isLoading) return <LoadingState />;
  if (!q.data || q.data.length === 0) {
    return (
      <EmptyState
        title="Bu kategoride henüz konu yok"
        description="İlk soruyu ya da paylaşımı sen yap."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {q.data.map((t) => (
        <li key={t.id}>
          <Link
            to="/forum/$threadId"
            params={{ threadId: t.id }}
            className="block rounded-lg border border-border bg-card p-4 hover:border-primary"
          >
            <div className="flex items-start gap-2">
              {t.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{t.title}</h3>
                  {t.status === "solved" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Çözüldü
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {t.profile?.display_name ?? "Kullanıcı"} ·{" "}
                  {new Date(t.created_at).toLocaleDateString("tr-TR")}
                  {t.vehicle_brand && ` · ${t.vehicle_brand} ${t.vehicle_model ?? ""}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" /> {t.like_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> {t.reply_count}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {t.view_count}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NewThreadDialog({
  categories,
  defaultCategoryId,
}: {
  categories: { id: string; name: string }[];
  defaultCategoryId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(createForumThread);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          category_id: categoryId || categories[0]?.id,
          title,
          body,
          vehicle_brand: brand || null,
          vehicle_model: model || null,
        },
      }),
    onSuccess: () => {
      toast.success("Konu oluşturuldu.");
      setOpen(false);
      setTitle("");
      setBody("");
      setBrand("");
      setModel("");
      qc.invalidateQueries({ queryKey: ["forum-threads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Yeni konu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni forum konusu</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Başlık"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={8000}
            placeholder="Sorununu ya da paylaşımını anlat…"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              maxLength={60}
              placeholder="Marka (opsiyonel)"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              maxLength={60}
              placeholder="Model (opsiyonel)"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending || title.trim().length < 3 || body.trim().length < 1 || !categoryId
            }
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Oluştur
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
