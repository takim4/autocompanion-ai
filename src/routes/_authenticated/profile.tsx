import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  Bookmark,
  Camera,
  ChevronRight,
  FileText,
  Heart,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Play,
  Store,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingState, EmptyState } from "@/components/data-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getMyProfile, updateMyProfile } from "@/lib/garage.functions";
import {
  listFeedPosts,
  listFollowers,
  listFollowing,
  listMyComments,
  listMyLikedPosts,
  listMySavedPosts,
} from "@/lib/social.functions";
import { useAuth } from "@/hooks/use-auth";
import { uploadToBucket } from "@/lib/uploads";
import { PostCard } from "@/components/post-card";

type ProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profil — AutoSocial" }] }),
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fn = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["me"], queryFn: () => fn() });
  const uploadFn = useServerFn(updateMyProfile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState("posts");

  const avatarMut = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Oturum bulunamadı");
      setUploading(true);
      const url = await uploadToBucket("avatars", file, user.id);
      return uploadFn({ data: { avatar_url: url } });
    },
    onSuccess: () => {
      toast.success("Profil fotoğrafı güncellendi.");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  if (q.isLoading) return <LoadingState />;
  const p = q.data;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={p?.avatar_url ?? undefined} alt={p?.display_name ?? "Kullanıcı"} />
              <AvatarFallback>
                <User className="h-7 w-7" />
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow disabled:opacity-50"
              aria-label="Profil fotoğrafı değiştir"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatarMut.mutate(file);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{p?.display_name ?? "Kullanıcı"}</h1>
            {p?.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-semibold text-accent-foreground">
            <Award className="h-4 w-4" />
            {p?.reputation ?? 0}
          </div>
        </div>
        {p?.bio && <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>}

        <div className="mt-4 flex items-center gap-4 text-sm">
          <FollowStat label="Gönderi" value={p?.post_count ?? 0} />
          {user && (
            <>
              <FollowListDialog
                userId={user.id}
                kind="followers"
                count={p?.follower_count ?? 0}
                label="Takipçi"
              />
              <FollowListDialog
                userId={user.id}
                kind="following"
                count={p?.following_count ?? 0}
                label="Takip"
              />
            </>
          )}
          <div className="ml-auto">
            <EditProfileDialog profile={p ?? null} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ProfileLink
          to="/services"
          icon={<Store className="h-4 w-4" />}
          title="Hizmetler"
          desc="Yakınındaki ustalar"
        />
        <ProfileLink
          to="/communities"
          icon={<Users className="h-4 w-4" />}
          title="Topluluklar"
          desc="Araç toplulukların"
        />
        <ProfileLink
          to="/quotes"
          icon={<FileText className="h-4 w-4" />}
          title="Tekliflerim"
          desc="Gönderdiğin teklif istekleri"
        />
        <ProfileLink
          to="/whatsapp-history"
          icon={<MessageCircle className="h-4 w-4" />}
          title="WhatsApp Geçmişi"
          desc="Ustalarla mesaj geçmişi"
        />
        <ProfileLink
          to="/mechanic-panel"
          icon={<Wrench className="h-4 w-4" />}
          title="Usta Paneli"
          desc="İşletme profilini yönet"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">
            <Play className="mr-1 h-3.5 w-3.5" /> Gönderiler
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessagesSquare className="mr-1 h-3.5 w-3.5" /> Yorumlar
          </TabsTrigger>
          <TabsTrigger value="likes">
            <Heart className="mr-1 h-3.5 w-3.5" /> Beğeniler
          </TabsTrigger>
          <TabsTrigger value="saves">
            <Bookmark className="mr-1 h-3.5 w-3.5" /> Kayıtlar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts">{user && <MyPostsTab userId={user.id} />}</TabsContent>
        <TabsContent value="comments">
          <MyCommentsTab />
        </TabsContent>
        <TabsContent value="likes">
          <LikedPostsTab />
        </TabsContent>
        <TabsContent value="saves">
          <SavedPostsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FollowStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FollowListDialog({
  userId,
  kind,
  count,
  label,
}: {
  userId: string;
  kind: "followers" | "following";
  count: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const followersFn = useServerFn(listFollowers);
  const followingFn = useServerFn(listFollowing);
  const q = useQuery({
    queryKey: [kind, userId],
    queryFn: async () => {
      const rows =
        kind === "followers"
          ? await followersFn({ data: { user_id: userId } })
          : await followingFn({ data: { user_id: userId } });
      return rows.map((r) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profile: (r as any).profile as ProfileLite | null,
      }));
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-center">
          <FollowStat label={label} value={count} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        {q.isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor…
          </div>
        )}
        {q.data && q.data.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">Kimse yok.</p>
        )}
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {(q.data ?? []).map(({ profile }) => {
            if (!profile) return null;
            return (
              <li key={profile.id} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {profile.display_name ?? "Kullanıcı"}
                  </p>
                  {profile.username && (
                    <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({
  profile,
}: {
  profile: { display_name?: string | null; username?: string | null; bio?: string | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const qc = useQueryClient();
  const fn = useServerFn(updateMyProfile);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          display_name: displayName || undefined,
          username: username || undefined,
          bio,
        },
      }),
    onSuccess: () => {
      toast.success("Profil güncellendi.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
        >
          Profili düzenle
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Profili düzenle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">İsim</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Kullanıcı adı</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Kaydet
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function MyPostsTab({ userId }: { userId: string }) {
  const fn = useServerFn(listFeedPosts);
  const q = useQuery({
    queryKey: ["my-posts", userId],
    queryFn: () => fn({ data: { author_id: userId } }),
  });
  if (q.isLoading) return <LoadingState />;
  if (!q.data || q.data.length === 0) return <EmptyState title="Henüz gönderi yok" icon={Play} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {q.data.map((post) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <PostCard key={post.id as string} post={post as any} queryKey={["my-posts", userId]} />
      ))}
    </div>
  );
}

function MyCommentsTab() {
  const fn = useServerFn(listMyComments);
  const q = useQuery({ queryKey: ["my-comments"], queryFn: () => fn() });
  if (q.isLoading) return <LoadingState />;
  if (!q.data || q.data.length === 0)
    return <EmptyState title="Henüz yorum yok" icon={MessagesSquare} />;
  return (
    <ul className="space-y-2">
      {q.data.map((c) => (
        <li key={c.id} className="rounded-lg border border-border bg-card p-3 text-sm">
          <p className="text-[11px] text-muted-foreground">
            {c.target_type === "post" ? "Bir gönderiye" : "Bir forum konusuna"} yorum yaptınız ·{" "}
            {new Date(c.created_at).toLocaleDateString("tr-TR")}
          </p>
          <p className="mt-1">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}

function LikedPostsTab() {
  const fn = useServerFn(listMyLikedPosts);
  const q = useQuery({ queryKey: ["my-likes"], queryFn: () => fn() });
  if (q.isLoading) return <LoadingState />;
  if (!q.data || q.data.length === 0) return <EmptyState title="Henüz beğeni yok" icon={Heart} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {q.data.map((post) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <PostCard key={post.id as string} post={post as any} queryKey={["my-likes"]} />
      ))}
    </div>
  );
}

function SavedPostsTab() {
  const fn = useServerFn(listMySavedPosts);
  const q = useQuery({ queryKey: ["my-saves"], queryFn: () => fn() });
  if (q.isLoading) return <LoadingState />;
  if (!q.data || q.data.length === 0) return <EmptyState title="Henüz kayıt yok" icon={Bookmark} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {q.data.map((post) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <PostCard key={post.id as string} post={post as any} queryKey={["my-saves"]} />
      ))}
    </div>
  );
}
