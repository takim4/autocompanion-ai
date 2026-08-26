import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  Camera,
  Circle,
  Download,
  FlipHorizontal2,
  Loader2,
  RotateCcw,
  Radio,
  Send,
  Sparkles,
  Square,
  Timer,
  Video as VideoIcon,
  Zap,
} from "lucide-react";
import { createSocialPost } from "@/lib/social.functions";
import { uploadUserMedia } from "@/lib/media-upload";

const searchSchema = z.object({
  as: fallback(z.enum(["reel", "story"]), "reel").default("reel"),
});

export const Route = createFileRoute("/_authenticated/feed/create")({
  validateSearch: zodValidator(searchSchema),
  component: FeedCreatePage,
  head: () => ({ meta: [{ title: "Oluştur — AutoSocial" }] }),
});

type Mode = "video" | "foto" | "canli";
const DAILY_LIMIT = 5;
const USED_TODAY = 2;

const FILTERS = [
  { label: "Orijinal", css: "none" },
  { label: "Siyah Beyaz", css: "grayscale(1)" },
  { label: "Sepya", css: "sepia(0.9)" },
  { label: "Canlı", css: "contrast(1.2) saturate(1.5)" },
] as const;

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const type of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

function FeedCreatePage() {
  const { as } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("video");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [filterIndex, setFilterIndex] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const filter = FILTERS[filterIndex];

  const needsAudio = mode !== "foto";

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Bu tarayıcı kamera erişimini desteklemiyor.");
      return;
    }
    let cancelled = false;
    let localStream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode }, audio: needsAudio })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream = s;
        setStream(s);
        setCameraError(null);
      })
      .catch(() => {
        if (!cancelled) setCameraError("Kameraya erişilemedi — tarayıcı izinlerini kontrol et.");
      });
    return () => {
      cancelled = true;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, needsAudio]);

  // Callback ref (değil düz ref) kullanılıyor çünkü "Tekrar çek" sonrası canlı
  // <video> elemanı yeniden mount ediliyor — sadece stream değiştiğinde çalışan
  // bir efekt bu remount'ı yakalayamaz ve önizleme siyah kalır.
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el) el.srcObject = stream;
    },
    [stream],
  );

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      runCapture();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo);
      if (videoResult) URL.revokeObjectURL(videoResult);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = filter.css;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhoto(URL.createObjectURL(blob));
          setResultBlob(blob);
        }
      },
      "image/jpeg",
      0.92,
    );
  }

  function startRecording() {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: pickSupportedMimeType() });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      setVideoResult(URL.createObjectURL(blob));
      setResultBlob(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function runCapture() {
    if (cameraError) {
      toast.error(cameraError);
      return;
    }
    if (mode === "foto") {
      takePhoto();
    } else if (mode === "video") {
      recording ? stopRecording() : startRecording();
    } else {
      toast.info("Canlı yayın altyapısı henüz aktif değil — yakında!");
    }
  }

  function onCaptureClick() {
    if (timerOn && mode !== "canli" && !recording) {
      setCountdown(3);
      return;
    }
    runCapture();
  }

  async function toggleTorch() {
    const track = stream?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as
      (MediaTrackCapabilities & { torch?: boolean }) | undefined;
    if (!track || !capabilities?.torch) {
      toast.info("Cihazın flaş/torch kontrolünü desteklemiyor.");
      return;
    }
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn((v) => !v);
    } catch {
      toast.info("Flaş açılamadı.");
    }
  }

  function cycleFilter() {
    const next = (filterIndex + 1) % FILTERS.length;
    setFilterIndex(next);
    toast.info(`Efekt: ${FILTERS[next].label}`);
  }

  function retake() {
    if (photo) URL.revokeObjectURL(photo);
    if (videoResult) URL.revokeObjectURL(videoResult);
    setPhoto(null);
    setVideoResult(null);
    setResultBlob(null);
  }

  const result = photo ?? videoResult;

  const createPostFn = useServerFn(createSocialPost);
  const publishMut = useMutation({
    mutationFn: async () => {
      if (!resultBlob) throw new Error("Paylaşılacak bir şey yok.");
      const file = new File([resultBlob], photo ? "capture.jpg" : "capture.webm", {
        type: resultBlob.type || (photo ? "image/jpeg" : "video/webm"),
      });
      const uploaded = await uploadUserMedia(file, "social");
      return createPostFn({
        data: { kind: as, media_url: uploaded.url, media_type: uploaded.type },
      });
    },
    onSuccess: () => {
      toast.success(as === "story" ? "Hikayen paylaşıldı." : "Gönderin paylaşıldı.");
      navigate({ to: "/feed" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    // Telefonda tam ekran kamera arayüzü; tablet/masaüstünde ortalanmış bir
    // "cihaz çerçevesi" içinde gösterilir.
    <div className="-mx-4 -my-6 md:mx-0 md:my-0 md:flex md:justify-center md:bg-muted/40 md:px-4 md:py-8">
      <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col md:min-h-0 md:w-[380px] md:overflow-hidden md:rounded-[2.5rem] md:border-8 md:border-card md:bg-background md:shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            to="/feed"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Vazgeç
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              Bugünkü hakkın
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:w-24">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(USED_TODAY / DAILY_LIMIT) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold">
              {USED_TODAY}/{DAILY_LIMIT}
            </span>
          </div>
        </div>

        <div className="flex flex-1 gap-2 px-4 md:flex-none">
          {/* Çekim alanı */}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-black md:aspect-[9/16]">
            {result ? (
              photo ? (
                <img src={photo} alt="Çekilen fotoğraf" className="h-full w-full object-cover" />
              ) : (
                <video src={videoResult!} controls className="h-full w-full object-cover" />
              )
            ) : (
              <video
                ref={attachVideo}
                autoPlay
                muted
                playsInline
                style={{
                  filter: filter.css,
                  transform: facingMode === "user" ? "scaleX(-1)" : undefined,
                }}
                className="h-full w-full object-cover"
              />
            )}

            {!result && cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-white/70">
                {cameraError}
              </div>
            )}

            {!result && countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-6xl font-bold text-white">{countdown}</span>
              </div>
            )}

            {!result && mode === "canli" && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                CANLI
              </span>
            )}
            {!result && recording && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Kaydediliyor
              </span>
            )}
          </div>

          {/* Yan araç çubuğu */}
          {!result && (
            <div className="flex w-12 shrink-0 flex-col items-center gap-4 rounded-2xl border border-border bg-card py-4">
              <button
                onClick={toggleTorch}
                className={torchOn ? "text-accent" : "text-muted-foreground hover:text-foreground"}
                aria-label="Flaş"
              >
                <Zap className={`h-5 w-5 ${torchOn ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Kamerayı çevir"
              >
                <FlipHorizontal2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setTimerOn((v) => !v)}
                className={timerOn ? "text-accent" : "text-muted-foreground hover:text-foreground"}
                aria-label="Zamanlayıcı"
              >
                <Timer className="h-5 w-5" />
              </button>
              <button
                onClick={cycleFilter}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Efektler"
              >
                <Sparkles className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Video, foto, canlı yayın seçimi */}
        <div className="mt-3 space-y-3 px-4 pb-4">
          {result ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={retake}
                disabled={publishMut.isPending}
                className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/30 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Tekrar çek
              </button>
              <a
                href={result}
                download={photo ? "autosocial-foto.jpg" : "autosocial-video.webm"}
                className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/30"
              >
                <Download className="h-3.5 w-3.5" /> İndir
              </a>
              <button
                onClick={() => publishMut.mutate()}
                disabled={publishMut.isPending}
                className="flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_-6px_hsl(var(--shadow-color)/0.6)] disabled:opacity-50"
              >
                {publishMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Paylaş
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                {(
                  [
                    { id: "foto", label: "Foto", icon: Camera },
                    { id: "video", label: "Video", icon: VideoIcon },
                    { id: "canli", label: "Canlı Yayın", icon: Radio },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => !recording && setMode(m.id)}
                      disabled={recording}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-accent/30"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={onCaptureClick}
                  disabled={!stream && !cameraError}
                  className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-card ring-2 transition-colors ${
                    recording ? "bg-red-600 ring-red-600" : "bg-primary ring-primary"
                  }`}
                  aria-label={
                    mode === "canli"
                      ? "Yayını başlat"
                      : mode === "foto"
                        ? "Fotoğraf çek"
                        : "Kaydı başlat/durdur"
                  }
                >
                  {mode === "video" && recording ? (
                    <Square className="h-6 w-6 fill-white text-white" />
                  ) : (
                    <Circle className="h-7 w-7 fill-primary-foreground text-primary-foreground" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
