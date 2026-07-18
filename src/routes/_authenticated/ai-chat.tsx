import { createFileRoute } from "@tanstack/react-router";
import { Bot, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/data-state";

export const Route = createFileRoute("/_authenticated/ai-chat")({
  component: AiChatPage,
  head: () => ({ meta: [{ title: "AI Teşhis — AutoSocial" }] }),
});

function AiChatPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bot className="h-6 w-6 text-primary" /> AI Arıza Teşhisi
        </h1>
        <p className="text-sm text-muted-foreground">
          Çoklu AI ajanı + topluluk bilgi havuzu
        </p>
      </header>
      <EmptyState
        icon={Sparkles}
        title="AI Chat yakında"
        description="Faz 2'de: RAG hattı + 6 AI ajanı orkestre edilerek burada aktif olacak. Şu an garaj + auth iskeleti hazır."
      />
    </div>
  );
}
