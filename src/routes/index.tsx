import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { generateSprite } from "@/server/sprite.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sprite Forge — Safe 2D Game Sprite Generator" },
      {
        name: "description",
        content:
          "Turn any prompt into an original, non-infringing 2D game sprite. Sanitize input, then generate with AI.",
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

type Result = {
  optionB: Variant;
  optionC: Variant;
};

function Index() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [input, setInput] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isHuman, setIsHuman] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);

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
    setStep(1);
    try {
      setStep(2);
      const payload =
        mode === "image"
          ? { referenceImage: referenceImage!, isHuman }
          : { input: input.trim(), isHuman };
      const res = await generateSprite({ data: payload });
      setStep(3);
      setResult(res);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep(0);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { n: 1, label: mode === "image" ? "Upload image" : "User input" },
    { n: 2, label: mode === "image" ? "Prepare prompts" : "Sanitize (B + C)" },
    { n: 3, label: "Send to Nano Banana" },
    { n: 4, label: "Return images" },
  ];


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sprite Forge
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Safe 2D sprite generator
          </h1>
          <p className="mt-3 text-muted-foreground">
            Type anything — names, characters, brands. We sanitize it into an original
            descriptor, then generate two sprite variants: Balanced (B) and Max Likeness (C).
          </p>
        </header>

        <Card className="p-6">
          <form onSubmit={handleGenerate} className="space-y-5">
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
                  placeholder="e.g. wolverine, big bird, donald trump..."
                  maxLength={200}
                  disabled={loading}
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
                      We'll send this image to Nano Banana and ask it to redraw
                      the subject as a 2D arcade sprite (B + C variants).
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

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="human" className="cursor-pointer">
                  Human subject
                </Label>
                <p className="text-xs text-muted-foreground">
                  Toggle for head-and-shoulders portrait framing
                </p>
              </div>
              <Switch id="human" checked={isHuman} onCheckedChange={setIsHuman} disabled={loading} />
            </div>

            <Button
              type="submit"
              disabled={
                loading ||
                (mode === "text" ? !input.trim() : !referenceImage)
              }
              className="w-full"
            >
              {loading ? "Generating..." : "Generate sprites"}
            </Button>
          </form>
        </Card>

        {/* Pipeline */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((s) => {
            const active = step >= s.n;
            const current = step === s.n && loading;
            return (
              <div
                key={s.n}
                className={`rounded-md border p-3 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {s.n}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </div>
                {current && (
                  <p className="mt-1 text-xs text-muted-foreground">Working…</p>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <Card className="mt-6 border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </Card>
        )}

        {result && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <VariantCard
              title="Option B — Balanced"
              subtitle="High likeness, still safe"
              variant={result.optionB}
              filename="sprite-option-b.png"
            />
            <VariantCard
              title="Option C — Max Likeness"
              subtitle="Aggressive caricature / satire"
              variant={result.optionC}
              filename="sprite-option-c.png"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VariantCard({
  title,
  subtitle,
  variant,
  filename,
}: {
  title: string;
  subtitle: string;
  variant: Variant;
  filename: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-white" style={{ aspectRatio: "17 / 12" }}>
          <img
            src={variant.imageUrl}
            alt={`${title} sprite`}
            className="h-full w-full object-contain"
          />
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
          Sanitizer system prompt
        </p>
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
          {variant.sanitizerPrompt}
        </pre>
      </Card>

      <Card className="p-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
          Sanitized descriptor
        </p>
        <p className="text-sm">{variant.descriptor}</p>
      </Card>

      <Card className="p-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
          Final image prompt
        </p>
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
          {variant.imagePrompt}
        </pre>
      </Card>

      <a
        href={variant.imageUrl}
        download={filename}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Download PNG
      </a>
    </div>
  );
}
