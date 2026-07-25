import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/data-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCommunity, listCommunities } from "@/lib/communities.functions";
import { useAuth } from "@/hooks/use-auth";
import { uploadToBucket } from "@/lib/uploads";

export const Route = createFileRoute("/_authenticated/communities")({
  component: CommunitiesPage,
  head: () => ({ meta: [{ title: "Topluluklar — AutoSocial" }] }),
});

function CommunitiesPage() {
  const [q, setQ] = useState("");
  const fn = useServerFn(listCommunities);
  const query = useQuery({
    queryKey: ["communities", q],
    queryFn: () => fn({ data: { q: q || undefined } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" /> Araç Toplulukları
        </h1>
        <CreateCommunityDialog />
      </div>
      <p className="text-sm text-muted-foreground">
        Marka veya modele özel topluluklar kur, üyelerinle sohbet et, kendi forumunu ve yönetim
        ekibini oluştur.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Topluluk ara…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      {query.isLoading && <LoadingState />}
      {query.data && query.data.length === 0 && (
        <EmptyState title="Henüz topluluk yok" description="İlk topluluğu sen kur." />
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(query.data ?? []).map((c) => (
          <Link
            key={c.id}
            to="/communities/$communityId"
            params={{ communityId: c.id }}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={c.avatar_url ?? undefined} />
                <AvatarFallback>
                  <Users className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.brand ? `${c.brand}${c.model ? " " + c.model : ""} · ` : ""}
                  {c.member_count} üye
                </p>
              </div>
              {c.is_paid && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                  <Lock className="h-3 w-3" /> {c.price_amount} {c.price_currency}
                </span>
              )}
            </div>
            {c.description && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            )}
            {c.my_membership && (
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {c.my_membership.status === "active"
                  ? c.my_membership.role === "founder"
                    ? "Kurucu"
                    : c.my_membership.role === "co_admin"
                      ? "Co-admin"
                      : "Üyesin"
                  : "Başvurun bekliyor"}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CreateCommunityDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const fn = useServerFn(createCommunity);

  const mut = useMutation({
    mutationFn: async () => {
      let avatar_url: string | null = null;
      if (avatarFile && user) {
        avatar_url = await uploadToBucket("communities", avatarFile, user.id);
      }
      return fn({
        data: {
          name,
          description: description || null,
          brand: brand || null,
          model: model || null,
          avatar_url,
          is_paid: isPaid,
          price_amount: isPaid ? Number(price) : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Topluluk oluşturuldu.");
      setOpen(false);
      setName("");
      setDescription("");
      setBrand("");
      setModel("");
      setIsPaid(false);
      setPrice("");
      setAvatarFile(null);
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Topluluk kur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni topluluk kur</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Topluluk adı"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Açıklama"
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
          <div>
            <label className="mb-1 block text-xs font-medium">Topluluk fotoğrafı (opsiyonel)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
            Ücretli topluluk
          </label>
          {isPaid && (
            <div>
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ücret (₺)"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ödeme altyapısı bu ortamda bağlı değil: üyelik başvurusu onaylandıktan sonra ödemeyi
                kendi kanallarınızdan (havale, elden vb.) alıp topluluk üyeler panelinden "ödendi"
                olarak işaretleyebilirsiniz.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || name.trim().length < 2 || (isPaid && !price)}
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
