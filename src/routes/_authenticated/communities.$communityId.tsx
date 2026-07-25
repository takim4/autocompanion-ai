import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Award,
  Check,
  Crown,
  Flag,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/data-state";
import { ReportDialog } from "@/components/report-dialog";
import {
  getCommunity,
  leaveCommunity,
  listCommunityMembers,
  listCommunityMessages,
  markMemberPaid,
  removeCommunityMember,
  requestJoinCommunity,
  respondJoinRequest,
  sendCommunityMessage,
  setCommunityMemberRole,
} from "@/lib/communities.functions";
import { createForumThread, listForumThreads } from "@/lib/forum.functions";
import { listCommunityReports, resolveReport } from "@/lib/reports.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/communities/$communityId")({
  component: CommunityDetailPage,
  head: () => ({ meta: [{ title: "Topluluk — AutoSocial" }] }),
});

function CommunityDetailPage() {
  const { communityId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fn = useServerFn(getCommunity);
  const q = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => fn({ data: { id: communityId } }),
  });

  const joinFn = useServerFn(requestJoinCommunity);
  const leaveFn = useServerFn(leaveCommunity);

  const joinMut = useMutation({
    mutationFn: () => joinFn({ data: { community_id: communityId } }),
    onSuccess: () => {
      toast.success("Başvurun gönderildi.");
      qc.invalidateQueries({ queryKey: ["community", communityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const leaveMut = useMutation({
    mutationFn: () => leaveFn({ data: { community_id: communityId } }),
    onSuccess: () => {
      toast.success("Topluluktan ayrıldın.");
      qc.invalidateQueries({ queryKey: ["community", communityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <LoadingState />;
  if (!q.data) return <EmptyState title="Topluluk bulunamadı" />;
  const c = q.data;
  const membership = c.my_membership;
  const isFullMember =
    membership?.status === "active" && (!c.is_paid || membership.payment_status === "paid");
  const isAdmin =
    membership?.status === "active" &&
    (membership.role === "founder" || membership.role === "co_admin");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/communities"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Topluluklara dön
      </Link>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={c.avatar_url ?? undefined} />
            <AvatarFallback>
              <Users className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{c.name}</h1>
            <p className="text-[11px] text-muted-foreground">
              {c.brand ? `${c.brand}${c.model ? " " + c.model : ""} · ` : ""}
              {c.member_count} üye · Kurucu: {c.founder_profile?.display_name ?? "—"}
            </p>
          </div>
          {c.is_paid && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600">
              <Lock className="h-3 w-3" /> {c.price_amount} {c.price_currency}
            </span>
          )}
        </div>
        {c.description && <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>}

        <div className="mt-3 flex items-center gap-2">
          {!membership && (
            <Button size="sm" onClick={() => joinMut.mutate()} disabled={joinMut.isPending}>
              {joinMut.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {c.is_paid ? "Başvur (ücretli)" : "Katıl"}
            </Button>
          )}
          {membership?.status === "pending" && (
            <span className="text-xs text-muted-foreground">Başvurun onay bekliyor…</span>
          )}
          {membership?.status === "active" && membership.role !== "founder" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => leaveMut.mutate()}
              disabled={leaveMut.isPending}
            >
              Topluluktan ayrıl
            </Button>
          )}
          {membership?.status === "active" && c.is_paid && membership.payment_status !== "paid" && (
            <span className="text-xs text-amber-600">
              Ödeme bekleniyor — tam erişim için kurucuyla iletişime geç.
            </span>
          )}
          {user?.id !== c.founder_id && <ReportDialog targetType="community" targetId={c.id} />}
        </div>
      </div>

      {!isFullMember ? (
        <EmptyState
          title={
            membership?.status === "pending"
              ? "Başvurun onaylandığında içerikler açılacak"
              : "Katılmak için başvur"
          }
          description={
            c.is_paid
              ? "Bu ücretli bir topluluk; onay ve ödeme sonrası sohbet ve foruma erişebilirsin."
              : undefined
          }
          icon={Lock}
        />
      ) : (
        <CommunityTabs communityId={communityId} isAdmin={isAdmin} founderId={c.founder_id} />
      )}
    </div>
  );
}

function CommunityTabs({
  communityId,
  isAdmin,
  founderId,
}: {
  communityId: string;
  isAdmin: boolean;
  founderId: string;
}) {
  const [tab, setTab] = useState("chat");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className={`grid w-full ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
        <TabsTrigger value="chat">Sohbet</TabsTrigger>
        <TabsTrigger value="forum">Forum</TabsTrigger>
        <TabsTrigger value="members">Üyeler</TabsTrigger>
        {isAdmin && <TabsTrigger value="reports">Şikayetler</TabsTrigger>}
      </TabsList>
      <TabsContent value="chat">
        <ChatTab communityId={communityId} />
      </TabsContent>
      <TabsContent value="forum">
        <CommunityForumTab communityId={communityId} />
      </TabsContent>
      <TabsContent value="members">
        <MembersTab communityId={communityId} isAdmin={isAdmin} founderId={founderId} />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="reports">
          <CommunityReportsTab communityId={communityId} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function ChatTab({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const listFn = useServerFn(listCommunityMessages);
  const sendFn = useServerFn(sendCommunityMessage);
  const q = useQuery({
    queryKey: ["community-messages", communityId],
    queryFn: () => listFn({ data: { community_id: communityId } }),
    refetchInterval: 4000,
  });

  const mut = useMutation({
    mutationFn: () => sendFn({ data: { community_id: communityId, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["community-messages", communityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-[26rem] flex-col rounded-lg border border-border bg-card">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {q.isLoading && <LoadingState />}
        {q.data && q.data.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">İlk mesajı sen gönder.</p>
        )}
        {(q.data ?? []).map((m) => (
          <div key={m.id} className="flex items-start gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={m.profile?.avatar_url ?? undefined} />
              <AvatarFallback>
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs">
                <span className="font-semibold">{m.profile?.display_name ?? "Kullanıcı"}</span>{" "}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <p className="text-sm">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mesaj yaz…"
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && body.trim()) mut.mutate();
          }}
        />
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || body.trim().length === 0}
          className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-50"
        >
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function CommunityForumTab({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const listFn = useServerFn(listForumThreads);
  const createFn = useServerFn(createForumThread);
  const q = useQuery({
    queryKey: ["forum-threads", "community", communityId],
    queryFn: () => listFn({ data: { community_id: communityId } }),
  });

  const mut = useMutation({
    mutationFn: () => createFn({ data: { community_id: communityId, title, body } }),
    onSuccess: () => {
      toast.success("Konu oluşturuldu.");
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["forum-threads", "community", communityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="mb-2 text-xs font-semibold">Yeni topluluk konusu</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Başlık"
          className="mb-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={8000}
          placeholder="İçerik"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || title.trim().length < 3 || !body.trim()}
          >
            {mut.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Paylaş
          </Button>
        </div>
      </div>

      {q.isLoading && <LoadingState />}
      {q.data && q.data.length === 0 && <EmptyState title="Henüz konu yok" icon={MessageSquare} />}
      <ul className="space-y-2">
        {(q.data ?? []).map((t) => (
          <li key={t.id}>
            <Link
              to="/forum/$threadId"
              params={{ threadId: t.id }}
              className="block rounded-lg border border-border bg-card p-3 hover:border-primary"
            >
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.profile?.display_name ?? "Kullanıcı"} · {t.reply_count} yanıt
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MembersTab({
  communityId,
  isAdmin,
  founderId,
}: {
  communityId: string;
  isAdmin: boolean;
  founderId: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listCommunityMembers);
  const respondFn = useServerFn(respondJoinRequest);
  const roleFn = useServerFn(setCommunityMemberRole);
  const removeFn = useServerFn(removeCommunityMember);
  const paidFn = useServerFn(markMemberPaid);

  const q = useQuery({
    queryKey: ["community-members", communityId],
    queryFn: () => listFn({ data: { community_id: communityId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["community-members", communityId] });
  const respondMut = useMutation({
    mutationFn: (vars: { id: string; approve: boolean }) =>
      respondFn({ data: { member_id: vars.id, approve: vars.approve } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const roleMut = useMutation({
    mutationFn: (vars: { id: string; role: "co_admin" | "member" }) =>
      roleFn({ data: { member_id: vars.id, role: vars.role } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { member_id: id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const paidMut = useMutation({
    mutationFn: (id: string) => paidFn({ data: { member_id: id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <LoadingState />;
  const members = (q.data ?? []).filter((m) => m.status === "active");
  const pending = (q.data ?? []).filter((m) => m.status === "pending");

  return (
    <div className="space-y-4">
      {isAdmin && pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
            Bekleyen başvurular ({pending.length})
          </h3>
          <ul className="space-y-2">
            {pending.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.profile?.display_name ?? "Kullanıcı"}
                  </p>
                  {m.join_message && (
                    <p className="truncate text-xs text-muted-foreground">{m.join_message}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => respondMut.mutate({ id: m.id, approve: true })}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => respondMut.mutate({ id: m.id, approve: false })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
          Üyeler ({members.length})
        </h3>
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.profile?.display_name ?? "Kullanıcı"}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {m.role === "founder" && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      <Crown className="h-3 w-3" /> Kurucu
                    </span>
                  )}
                  {m.role === "co_admin" && (
                    <span className="inline-flex items-center gap-0.5 text-primary">
                      <ShieldCheck className="h-3 w-3" /> Co-admin
                    </span>
                  )}
                  {m.role === "member" && "Üye"}
                  {m.payment_status === "pending" && (
                    <span className="ml-1 text-amber-600">· ödeme bekliyor</span>
                  )}
                </p>
              </div>
              {isAdmin && m.user_id !== founderId && m.user_id !== user?.id && (
                <div className="flex items-center gap-1">
                  {m.payment_status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => paidMut.mutate(m.id)}
                    >
                      Ödendi işaretle
                    </Button>
                  )}
                  {m.role === "member" ? (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      title="Co-admin yap"
                      onClick={() => roleMut.mutate({ id: m.id, role: "co_admin" })}
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      title="Üyeliğe indir"
                      onClick={() => roleMut.mutate({ id: m.id, role: "member" })}
                    >
                      <Award className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    title="Çıkar"
                    onClick={() => removeMut.mutate(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CommunityReportsTab({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listCommunityReports);
  const resolveFn = useServerFn(resolveReport);
  const q = useQuery({
    queryKey: ["community-reports", communityId],
    queryFn: () => listFn({ data: { community_id: communityId } }),
  });

  const mut = useMutation({
    mutationFn: (vars: { id: string; status: "resolved" | "dismissed" }) =>
      resolveFn({ data: { id: vars.id, status: vars.status } }),
    onSuccess: () => {
      toast.success("Şikayet güncellendi.");
      qc.invalidateQueries({ queryKey: ["community-reports", communityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <LoadingState />;
  if (!q.data || q.data.length === 0) return <EmptyState title="Şikayet yok" icon={Flag} />;

  return (
    <ul className="space-y-2">
      {q.data.map((r) => (
        <li key={r.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              {r.target_type} · {r.reason}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString("tr-TR")}
            </span>
          </div>
          {r.details && <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bildiren: {r.reporter_profile?.display_name ?? "Kullanıcı"} · Durum: {r.status}
          </p>
          {r.status === "open" || r.status === "reviewing" ? (
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
          ) : null}
        </li>
      ))}
    </ul>
  );
}
