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
    color: "from-primary/30 to-primary/5",
  },
  {
    icon: Users,
    title: "Topluluk Doğrulaması",
    desc: "Aynı aracı kullanan binlerce kişinin oyuyla doğru çözümler yükselir.",
    color: "from-accent/30 to-accent/5",
  },
  {
    icon: Car,
    title: "Kişisel Garaj",
    desc: "Aracınızı ekleyin, size özel kronik sorunları ve çözümleri görün.",
    color: "from-success/30 to-success/5",
  },
];

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const s = slides[step];
  const Icon = s.icon;
  const last = step === slides.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between">
        <div className="flex justify-end">
          <button
            onClick={() => nav({ to: "/auth" })}
            className="text-sm text-muted-foreground hover:text-foreground"
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
            <div
              className={`mb-8 flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${s.color}`}
            >
              <Icon className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {s.desc}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <Button
            size="lg"
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
