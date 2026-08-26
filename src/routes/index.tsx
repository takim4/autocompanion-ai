import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/autosocial-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: SplashPage,
});

function SplashPage() {
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.replace("/forum");
      } else {
        window.location.replace("/onboarding");
      }
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-5"
      >
        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-brand-gradient shadow-[0_20px_45px_-18px_hsl(var(--shadow-color)/0.45)]">
          <img src={logoAsset.url} alt="AutoSocial" className="h-full w-full object-cover" />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="font-display text-2xl font-medium tracking-tight"
        >
          AutoSocial
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          AI teşhisi · topluluk onayı
        </motion.p>
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, ease: "easeInOut", delay: 0.2 }}
        className="absolute bottom-16 h-px w-32 origin-left bg-border"
      />
      <Link
        to="/onboarding"
        className="absolute bottom-8 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Devam et →
      </Link>
    </div>
  );
}
