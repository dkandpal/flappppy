import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { generateSprite } from "@/server/sprite.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AutoCutout } from "@/components/AutoCutout";
import { Menu, UploadCloud, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sprite Forge — Safe 2D Game Sprite Generator" },
      {
        name: "description",
        content:
          "Turn any prompt into an original, non-infringing 2D game sprite in three simple steps.",
      },
    ],
  }),
});

type Variant = {
  sanitizerPrompt: string;
  descriptor: string;
  imagePrompt: string;
  imageUrl: string;
};

type Result = { optionB: Variant; optionC: Variant };
type Step = 1 | 2 | 3;
type VariantKey = "B" | "C";

function Index() {
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [input, setInput] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<VariantKey | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8MB");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (mode === "text" && !input.trim()) return;
    if (mode === "image" && !referenceImage) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(null);
    try {
      const payload =
        mode === "image"
          ? { referenceImage: referenceImage! }
          : { input: input.trim() };
      const res = await generateSprite({ data: payload });
      setResult(res);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function pickVariant(key: VariantKey) {
    setSelected(key);
    setStep(3);
  }

  function startOver() {
    setStep(1);
    setSelected(null);
    setResult(null);
    setError(null);
  }

  const selectedVariant =
    result && selected ? (selected === "B" ? result.optionB : result.optionC) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sprite Forge
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Make your game sprite in 3 steps
          </h1>
          <StepIndicator step={step} />
        </header>

        {error && (
          <Card className="mb-6 border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </Card>
        )}

        {step === 1 && (
          <StepOne
            mode={mode}
            setMode={setMode}
            input={input}
            setInput={setInput}
            referenceImage={referenceImage}
            setReferenceImage={setReferenceImage}
            handleFileChange={handleFileChange}
            handleGenerate={handleGenerate}
            loading={loading}
          />
        )}

        {step === 2 && result && (
          <StepTwo
            result={result}
            onPick={pickVariant}
            onBack={startOver}
            showDetails={showDetails}
            setShowDetails={setShowDetails}
          />
        )}

        {step === 3 && selectedVariant && (
          <StepThree
            variant={selectedVariant}
            variantLabel={selected === "B" ? "Variant 1" : "Variant 2"}
            onBack={() => setStep(2)}
            onStartOver={startOver}
          />
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const labels = ["Describe", "Choose", "Confirm"];
  return (
    <div className="mt-5 flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary/30 text-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </div>
            <span
              className={
                active ? "font-medium text-foreground" : "text-muted-foreground"
              }
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <div className="mx-2 h-px w-8 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepOne({
  mode,
  setMode,
  input,
  setInput,
  referenceImage,
  setReferenceImage,
  handleFileChange,
  handleGenerate,
  loading,
}: {
  mode: "text" | "image";
  setMode: (m: "text" | "image") => void;
  input: string;
  setInput: (v: string) => void;
  referenceImage: string | null;
  setReferenceImage: (v: string | null) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerate: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <Card className="p-6">
      <form onSubmit={handleGenerate} className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Describe your character</h2>
          <p className="text-sm text-muted-foreground">
            Type an idea or upload a reference image. Press Generate to continue.
          </p>
        </div>

        <div className="flex gap-2 rounded-md border border-border p-1">
          <button
            type="button"
            onClick={() => setMode("text")}
            disabled={loading}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "text"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Text prompt
          </button>
          <button
            type="button"
            onClick={() => setMode("image")}
            disabled={loading}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "image"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Upload image
          </button>
        </div>

        {mode === "text" ? (
          <div className="space-y-2">
            <Label htmlFor="input">Your idea</Label>
            <Input
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. a brave knight, a fire-breathing fox, a cyber ninja..."
              maxLength={200}
              disabled={loading}
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="file">Reference image</Label>
            <Input
              id="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              disabled={loading}
            />
            {referenceImage && (
              <div className="mt-2 flex items-center gap-3 rounded-md border border-border p-3">
                <img
                  src={referenceImage}
                  alt="Reference"
                  className="h-20 w-20 rounded object-cover"
                />
                <div className="flex-1 text-xs text-muted-foreground">
                  We'll use this image as the basis for your sprite.
                </div>
                <button
                  type="button"
                  onClick={() => setReferenceImage(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={
            loading || (mode === "text" ? !input.trim() : !referenceImage)
          }
          className="w-full"
        >
          {loading ? "Generating your sprites…" : "Generate"}
        </Button>

        {loading && (
          <p className="text-center text-xs text-muted-foreground">
            This usually takes 10–20 seconds.
          </p>
        )}
      </form>
    </Card>
  );
}

function StepTwo({
  result,
  onPick,
  onBack,
  showDetails,
  setShowDetails,
}: {
  result: Result;
  onPick: (k: VariantKey) => void;
  onBack: () => void;
  showDetails: boolean;
  setShowDetails: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pick your favorite</h2>
          <p className="text-sm text-muted-foreground">
            Click a variant to continue.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Start over
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <VariantChoice
          label="Variant 1"
          variant={result.optionB}
          onPick={() => onPick("B")}
          showDetails={showDetails}
        />
        <VariantChoice
          label="Variant 2"
          variant={result.optionC}
          onPick={() => onPick("C")}
          showDetails={showDetails}
        />
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {showDetails ? "Hide technical details" : "Show technical details"}
        </button>
      </div>
    </div>
  );
}

function VariantChoice({
  label,
  variant,
  onPick,
  showDetails,
}: {
  label: string;
  variant: Variant;
  onPick: () => void;
  showDetails: boolean;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onPick}
        className="group block w-full overflow-hidden rounded-lg border-2 border-border bg-white transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        style={{ aspectRatio: "17 / 12" }}
      >
        <img
          src={variant.imageUrl}
          alt={label}
          className="h-full w-full object-contain transition-transform group-hover:scale-[1.02]"
        />
      </button>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{label}</h3>
        <Button size="sm" onClick={onPick}>
          Choose this →
        </Button>
      </div>

      {showDetails && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <DetailBlock label="Sanitized descriptor" content={variant.descriptor} />
          <DetailBlock label="Image prompt" content={variant.imagePrompt} mono />
          <DetailBlock
            label="Sanitizer system prompt"
            content={variant.sanitizerPrompt}
            mono
          />
        </div>
      )}
    </div>
  );
}

function DetailBlock({
  label,
  content,
  mono,
}: {
  label: string;
  content: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {mono ? (
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
          {content}
        </pre>
      ) : (
        <p className="text-xs">{content}</p>
      )}
    </div>
  );
}

function StepThree({
  variant,
  variantLabel,
  onBack,
  onStartOver,
}: {
  variant: Variant;
  variantLabel: string;
  onBack: () => void;
  onStartOver: () => void;
}) {
  const SPRITE_W = 424;
  const SPRITE_H = 331;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [stretchedUrl, setStretchedUrl] = useState<string | null>(null);

  // Stretch cutout to required sprite-sheet dimensions
  useEffect(() => {
    if (!cutoutUrl) {
      setStretchedUrl(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SPRITE_W;
      canvas.height = SPRITE_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, SPRITE_W, SPRITE_H);
      setStretchedUrl(canvas.toDataURL("image/png"));
    };
    img.src = cutoutUrl;
  }, [cutoutUrl]);

  const checkerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
    backgroundColor: "#ffffff",
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {variantLabel} selected
        </p>
        <h2 className="mt-1 text-2xl font-bold">Ready to create your game?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your sprite is ready. Let's bring it to life.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {([
          { label: "Idle", overlay: null },
          { label: "Hit", overlay: <XOverlay /> },
        ] as const).map(({ label, overlay }) => (
          <div key={label} className="space-y-2">
            <Card className="overflow-hidden p-0">
              <div
                className="relative mx-auto"
                style={{
                  ...checkerStyle,
                  width: "100%",
                  maxWidth: SPRITE_W,
                  aspectRatio: `${SPRITE_W} / ${SPRITE_H}`,
                }}
              >
                <img
                  src={stretchedUrl ?? cutoutUrl ?? variant.imageUrl}
                  alt={`Selected sprite — ${label}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    position: "absolute",
                    inset: 0,
                  }}
                />
                {overlay && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden
                  >
                    {overlay}
                  </div>
                )}
              </div>
            </Card>
            <p className="text-center text-sm font-medium">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {stretchedUrl
          ? `Stretched to ${SPRITE_W}×${SPRITE_H} for sprite sheet`
          : cutoutUrl
            ? "Resizing…"
            : "Removing background…"}
      </p>

      {/* Hidden auto-cutout to drive the preview above */}
      <div className="sr-only" aria-hidden>
        <AutoCutout
          key={variant.imageUrl}
          imageUrl={variant.imageUrl}
          filename="sprite-cutout.png"
          autoRun
          defaultTolerance={25}
          defaultPadding={0}
          onCutoutReady={setCutoutUrl}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          size="lg"
          onClick={() => toast.success("Game builder coming soon!")}
        >
          Yes, let's create my game →
        </Button>
        <Button variant="outline" size="lg" onClick={onBack}>
          Pick a different variant
        </Button>
        <Button variant="ghost" size="lg" onClick={onStartOver}>
          Start over
        </Button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {showAdvanced ? "Hide advanced tools" : "Show advanced tools (download, cutout)"}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <a
              href={stretchedUrl ?? cutoutUrl ?? variant.imageUrl}
              download={stretchedUrl ? `sprite-${SPRITE_W}x${SPRITE_H}.png` : cutoutUrl ? "sprite-cutout.png" : "sprite.png"}
              className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              Download cutout PNG
            </a>
          </div>
          <AutoCutout
            imageUrl={variant.imageUrl}
            filename="sprite-cutout.png"
            defaultTolerance={25}
            defaultPadding={0}
          />
        </div>
      )}
    </div>
  );
}

function XOverlay() {
  return (
    <svg
      viewBox="0 0 424 331"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <g
        stroke="#dc2626"
        strokeWidth={36}
        strokeLinecap="round"
        opacity={0.85}
      >
        <line x1={50} y1={40} x2={374} y2={291} />
        <line x1={374} y1={40} x2={50} y2={291} />
      </g>
    </svg>
  );
}

