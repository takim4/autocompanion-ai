import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: SplashPage,
});

function SplashPage() {
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.replace("/home");
      } else {
        window.location.replace("/onboarding");
      }
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 px-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30">
            <span className="text-4xl font-black">A</span>
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Sparkles className="h-4 w-4" />
          </motion.div>
        </div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight">AutoSocial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI teşhisi · topluluk onayı
          </p>
        </motion.div>
      </motion.div>
      <Link
        to="/onboarding"
        className="absolute bottom-8 text-xs text-muted-foreground hover:text-foreground"
      >
        Devam et →
      </Link>
    </div>
  );
}
