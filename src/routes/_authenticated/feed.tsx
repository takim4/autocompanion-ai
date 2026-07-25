import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Image as ImageIcon, Loader2, Plus, Radio, Search, User, Video } from "lucide-react";
import { toast } from "sonner";
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
import { EmptyState, LoadingState } from "@/components/data-state";
import { PostCard, CommentsSection } from "@/components/post-card";
import {
  createPost,
  endLive,
  followUser,
  listFeedPosts,
  listLivePosts,
  searchProfiles,
  startLive,
  unfollowUser,
} from "@/lib/social.functions";
import { useAuth } from "@/hooks/use-auth";
import { uploadToBucket } from "@/lib/uploads";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "Akış — AutoSocial" },
      {
        name: "description",
        content: "Otomobil severlerin fotoğrafları, videoları ve canlı yayınları tek akışta.",
      },
    ],
  }),
});

type Tab = "posts" | "live" | "profiles";

function FeedPage() {
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <div className="-mx-4 -my-6">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background/95 backdrop-blur">
        {(
          [
            { id: "posts", label: "Gönderiler", icon: ImageIcon },
            { id: "live", label: "Canlı", icon: Radio },
            { id: "profiles", label: "Keşfet", icon: Search },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                active
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
        <div className="pr-3">
          <PostComposerDialog />
        </div>
      </div>

      <div className="p-4">
        {tab === "posts" && <PostsTab />}
        {tab === "live" && <LiveTab />}
        {tab === "profiles" && <ProfilesTab />}
      </div>
    </div>
  );
}

function PostsTab() {
  const fn = useServerFn(listFeedPosts);
  const q = useQuery({ queryKey: ["feed"], queryFn: () => fn({ data: {} }) });

  if (q.isLoading) return <LoadingState />;
  if (!q.data || q.data.length === 0) {
    return (
      <EmptyState
        title="Henüz gönderi yok"
        description="İlk fotoğraf, video veya paylaşımı sen yap."
        icon={ImageIcon}
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {q.data.map((post) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <PostCard key={post.id as string} post={post as any} queryKey={["feed"]} />
      ))}
    </div>
  );
}

function PostComposerDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"text" | "image" | "video">("text");
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fn = useServerFn(createPost);

  const mut = useMutation({
    mutationFn: async () => {
      let media_urls: string[] = [];
      if (type !== "text") {
        if (!file) throw new Error("Bir dosya seçmelisiniz");
        if (!user) throw new Error("Oturum bulunamadı");
        setUploading(true);
        const url = await uploadToBucket("posts", file, user.id);
        media_urls = [url];
      }
      return fn({ data: { type, caption: caption || null, media_urls, tag: tag || null } });
    },
    onSuccess: () => {
      toast.success("Paylaşıldı!");
      setOpen(false);
      setCaption("");
      setTag("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-8 w-8 rounded-full" aria-label="Gönderi oluştur">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Yeni gönderi</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(
              [
                ["text", "Metin"],
                ["image", "Fotoğraf"],
                ["video", "Video"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setType(v);
                  setFile(null);
                }}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                  type === v
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {type !== "text" && (
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-6 text-xs text-muted-foreground hover:bg-accent"
              >
                {type === "image" ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                {file ? file.name : "Dosya seç"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={type === "image" ? "image/*" : "video/*"}
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={2200}
            placeholder="Ne düşünüyorsun?"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            maxLength={40}
            placeholder="Etiket (opsiyonel, örn. Drift, Tamir)"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <DialogFooter>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || uploading}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {(mut.isPending || uploading) && <Loader2 className="h-3 w-3 animate-spin" />}
            Paylaş
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LiveTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fn = useServerFn(listLivePosts);
  const q = useQuery({ queryKey: ["live-posts"], queryFn: () => fn() });
  const endFn = useServerFn(endLive);
  const [joined, setJoined] = useState<string | null>(null);

  const endMut = useMutation({
    mutationFn: (id: string) => endFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Yayın sonlandırıldı.");
      qc.invalidateQueries({ queryKey: ["live-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <StartLiveDialog />
      {q.isLoading && <LoadingState />}
      {q.data && q.data.length === 0 && (
        <EmptyState
          title="Şu an canlı yayın yok"
          description="Bir soru-cevap ya da tanıtım için canlı yayın başlatabilirsin."
          icon={Radio}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(q.data ?? []).map((post) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = post as any;
          const isOwn = user?.id === p.user_id;
          const isJoined = joined === p.id;
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative flex aspect-video items-end bg-gradient-to-br from-red-600 to-slate-900 p-4">
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> CANLI
                </span>
                <div>
                  <p className="text-xs text-white/80">
                    {p.profile?.display_name ?? "Kullanıcı"}{" "}
                    {p.profile?.username ? `· @${p.profile.username}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{p.live_title}</p>
                </div>
              </div>
              <div className="p-3">
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Video altyapısı bu ortamda tanımlı değil — canlı sohbet üzerinden takip
                  edebilirsiniz.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setJoined(isJoined ? null : p.id)}
                  >
                    {isJoined ? "Sohbeti kapat" : "Sohbete katıl"}
                  </Button>
                  {isOwn && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => endMut.mutate(p.id)}
                      disabled={endMut.isPending}
                    >
                      Yayını bitir
                    </Button>
                  )}
                </div>
                {isJoined && (
                  <div className="mt-2 -mx-3 -mb-3">
                    <CommentsSection targetType="post" targetId={p.id} queryKey={["live-posts"]} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartLiveDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(startLive);
  const mut = useMutation({
    mutationFn: () => fn({ data: { title } }),
    onSuccess: () => {
      toast.success("Canlı yayın başladı.");
      setOpen(false);
      setTitle("");
      qc.invalidateQueries({ queryKey: ["live-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Radio className="h-3.5 w-3.5" /> Canlı yayın başlat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Canlı yayın başlat</DialogTitle>
        </DialogHeader>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="Yayın başlığı, örn. Motor sesinden arıza teşhisi"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Not: bu ortamda gerçek video altyapısı (WebRTC/RTMP sağlayıcı) tanımlı değil; yayın
          oturumu ve canlı sohbet gerçek zamanlıdır, görüntü aktarımı ileride bir sağlayıcı
          eklenince devreye girecek.
        </p>
        <DialogFooter>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || title.trim().length < 2}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Başlat
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfilesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const fn = useServerFn(searchProfiles);
  const q = useQuery({
    queryKey: ["search-profiles", search],
    queryFn: () => fn({ data: { q: search || undefined } }),
  });
  const followFn = useServerFn(followUser);
  const unfollowFn = useServerFn(unfollowUser);

  const followMut = useMutation({
    mutationFn: (id: string) => followFn({ data: { user_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-profiles"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const unfollowMut = useMutation({
    mutationFn: (id: string) => unfollowFn({ data: { user_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-profiles"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Kullanıcı ara…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {q.isLoading && <LoadingState />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Avatar className="h-14 w-14">
              <AvatarImage src={p.avatar_url ?? undefined} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.display_name ?? "Kullanıcı"}</p>
              {p.username && (
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {p.follower_count} takipçi · {p.post_count} gönderi
              </p>
            </div>
            <Button
              size="sm"
              variant={p.is_following ? "outline" : "default"}
              className="h-8"
              onClick={() => (p.is_following ? unfollowMut.mutate(p.id) : followMut.mutate(p.id))}
              disabled={followMut.isPending || unfollowMut.isPending}
            >
              {p.is_following ? "Takipten çık" : "Takip"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
