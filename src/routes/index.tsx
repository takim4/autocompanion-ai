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
    <div className="node-orbit-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        <div className="h-28 w-28 overflow-hidden rounded-[1.75rem] bg-brand-gradient shadow-[0_20px_45px_-15px_hsl(var(--shadow-color)/0.65)]">
          <img src={logoAsset.url} alt="AutoSocial" className="h-full w-full object-cover" />
        </div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">AutoSocial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI teşhisi · topluluk onayı
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="h-full w-full bg-brand-gradient"
          />
        </motion.div>
      </motion.div>
      <Link
        to="/onboarding"
        className="absolute bottom-8 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Devam et →
      </Link>
    </div>
  );
}
