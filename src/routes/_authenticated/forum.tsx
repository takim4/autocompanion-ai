import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/data-state";

export const Route = createFileRoute("/_authenticated/forum")({
  component: () => (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Users className="h-6 w-6" /> Topluluk Forumu
      </h1>
      <EmptyState
        title="Forum yakında"
        description="Faz 3'te: sorular, çözümler, oylama ve mikro-topluluklar."
      />
    </div>
  ),
  head: () => ({ meta: [{ title: "Forum — AutoSocial" }] }),
});
