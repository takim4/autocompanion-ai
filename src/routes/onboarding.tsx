import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Car, Users } from "lucide-react";
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
    icon: Bot,
    title: "AI Destekli Arıza Teşhisi",
    desc: "Aracınızın belirtilerini yazın, çoklu AI ajanı olası sebepleri anında sıralasın.",
  },
  {
    icon: Users,
    title: "Topluluk Doğrulaması",
    desc: "Aynı aracı kullanan binlerce kişinin oyuyla doğru çözümler yükselir.",
  },
  {
    icon: Car,
    title: "Kişisel Garaj",
    desc: "Aracınızı ekleyin, size özel kronik sorunları ve çözümleri görün.",
  },
];

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const s = slides[step];
  const Icon = s.icon;
  const last = step === slides.length - 1;

  return (
    <div className="node-orbit-bg flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between">
        <div className="flex justify-end">
          <button
            onClick={() => nav({ to: "/auth" })}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Atla
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-8 flex h-36 w-36 items-center justify-center rounded-[2rem] bg-primary-dim shadow-[0_20px_45px_-18px_hsl(var(--shadow-color)/0.4)]">
              <Icon className="h-14 w-14 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {s.desc}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Slayt ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-brand-gradient" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <Button
            size="lg"
            variant="brand"
            className="w-full"
            onClick={() =>
              last ? nav({ to: "/auth" }) : setStep((s) => s + 1)
            }
          >
            {last ? "Başla" : "Devam"}
          </Button>
        </div>
      </div>
    </div>
  );
}
