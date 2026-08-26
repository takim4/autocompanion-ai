import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Hoş geldiniz — AutoSocial" },
      { name: "description", content: "AutoSocial'a başlarken hızlı tanıtım." },
    ],
  }),
});

const slides = [
  {
    n: "01",
    title: "AI destekli arıza teşhisi",
    desc: "Aracının belirtilerini yaz, çoklu AI ajanı olası sebepleri anında sıralasın.",
  },
  {
    n: "02",
    title: "Topluluk doğrulaması",
    desc: "Aynı aracı kullanan binlerce kişinin oyuyla doğru çözümler yükselir.",
  },
  {
    n: "03",
    title: "Kişisel garaj",
    desc: "Aracını ekle, size özel kronik sorunları ve çözümleri gör.",
  },
];

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const s = slides[step];
  const last = step === slides.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold tracking-tight">AutoSocial</span>
          <button
            onClick={() => nav({ to: "/auth" })}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Atla
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            <span className="font-display text-7xl font-light text-muted-foreground/40">{s.n}</span>
            <h1 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight">
              {s.title}
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-5">
          <div className="flex gap-2 border-t border-border pt-5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Slayt ${i + 1}`}
                className={`h-[3px] flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-foreground" : "bg-border"
                }`}
              />
            ))}
          </div>
          <Button size="lg" variant="brand" onClick={() => (last ? nav({ to: "/auth" }) : setStep((s) => s + 1))}>
            {last ? "Başla" : "Devam"}
          </Button>
        </div>
      </div>
    </div>
  );
}
