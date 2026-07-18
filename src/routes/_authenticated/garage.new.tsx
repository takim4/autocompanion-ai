import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createVehicle } from "@/lib/garage.functions";
import {
  CAR_BRANDS,
  FUEL_LABELS,
  POPULAR_MODELS,
  TRANSMISSION_LABELS,
  YEARS,
} from "@/lib/car-data";

export const Route = createFileRoute("/_authenticated/garage/new")({
  component: NewVehiclePage,
  head: () => ({ meta: [{ title: "Araç Ekle — AutoSocial" }] }),
});

type Step = 0 | 1 | 2 | 3 | 4;

interface Draft {
  brand: string;
  model: string;
  year: number;
  mileage_km: string;
  fuel: string;
  transmission: string;
  engine_cc: string;
  nickname: string;
}

function NewVehiclePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createVehicle);
  const [step, setStep] = useState<Step>(0);
  const [d, setD] = useState<Draft>({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    mileage_km: "",
    fuel: "",
    transmission: "",
    engine_cc: "",
    nickname: "",
  });

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((s) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          brand: d.brand,
          model: d.model,
          year: d.year,
          mileage_km: d.mileage_km ? Number(d.mileage_km) : undefined,
          fuel: (d.fuel || undefined) as
            | "gasoline" | "diesel" | "lpg" | "hybrid" | "electric" | "other"
            | undefined,
          transmission: (d.transmission || undefined) as
            | "manual" | "automatic" | "semi_automatic" | "cvt" | "dct"
            | undefined,
          engine_cc: d.engine_cc ? Number(d.engine_cc) : undefined,
          nickname: d.nickname || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Araç eklendi 🚗");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      nav({ to: "/garage" });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Eklenemedi"),
  });

  const canNext =
    (step === 0 && d.brand) ||
    (step === 1 && d.model) ||
    (step === 2 && d.year) ||
    step === 3 ||
    step === 4;

  const steps = ["Marka", "Model", "Yıl", "Detaylar", "İsim"];
  const models = POPULAR_MODELS[d.brand] ?? [];

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => (step === 0 ? nav({ to: "/garage" }) : setStep((s) => (s - 1) as Step))}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Geri
      </button>

      <div className="mb-6 flex items-center gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          {step === 0 && (
            <>
              <h2 className="text-xl font-bold">Markanı seç</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aracının markası hangisi?
              </p>
              <div className="mt-4 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {CAR_BRANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      update("brand", b);
                      update("model", "");
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      d.brand === b
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">Model</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {d.brand} için model
              </p>
              {models.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {models.map((m) => (
                    <button
                      key={m}
                      onClick={() => update("model", m)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        d.model === m
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Label htmlFor="model-in">Veya elle yaz</Label>
                <Input
                  id="model-in"
                  value={d.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder="Örn. Golf 7"
                />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold">Model yılı</h2>
              <Select
                value={String(d.year)}
                onValueChange={(v) => update("year", Number(v))}
              >
                <SelectTrigger className="mt-4">
                  <SelectValue placeholder="Yıl seç" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold">Teknik detaylar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Opsiyonel — daha isabetli teşhis için önerilir.
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="km">Kilometre</Label>
                  <Input
                    id="km"
                    type="number"
                    value={d.mileage_km}
                    onChange={(e) => update("mileage_km", e.target.value)}
                    placeholder="Örn. 125000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Yakıt</Label>
                    <Select value={d.fuel} onValueChange={(v) => update("fuel", v)}>
                      <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FUEL_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Şanzıman</Label>
                    <Select value={d.transmission} onValueChange={(v) => update("transmission", v)}>
                      <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRANSMISSION_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="cc">Motor Hacmi (cc)</Label>
                  <Input
                    id="cc"
                    type="number"
                    value={d.engine_cc}
                    onChange={(e) => update("engine_cc", e.target.value)}
                    placeholder="Örn. 1600"
                  />
                </div>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h2 className="text-xl font-bold">Son dokunuş</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aracına bir takma isim ver (opsiyonel).
              </p>
              <div className="mt-4">
                <Label htmlFor="nick">Takma İsim</Label>
                <Input
                  id="nick"
                  value={d.nickname}
                  onChange={(e) => update("nickname", e.target.value)}
                  placeholder="Örn. Kırmızı Şimşek"
                />
              </div>

              <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
                <p className="font-semibold">Özet</p>
                <p className="mt-1 text-muted-foreground">
                  {d.brand} {d.model} · {d.year}
                  {d.mileage_km && ` · ${Number(d.mileage_km).toLocaleString("tr-TR")} km`}
                </p>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-20 md:bottom-4 z-10 mt-5 flex justify-end rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
        {step < 4 ? (
          <Button
            disabled={!canNext}
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            Devam <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-4 w-4" />
            )}
            Kaydet
          </Button>
        )}
      </div>
    </div>
  );
}
