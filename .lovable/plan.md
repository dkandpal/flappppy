## Goal

Restructure the home page into a clean 3-step wizard. The underlying generation pipeline (sanitize → Nano Banana → return two variants) stays exactly the same; only what the user sees changes.

## The new flow

```text
PAGE 1: Input
  ├─ Toggle: Text prompt / Upload image
  ├─ Single input field or dropzone
  └─ [Generate] → goes to Page 2 (shows loading state here while waiting)

PAGE 2: Choose variant
  ├─ Variant 1 card    Variant 2 card
  ├─ (image only, big, 17:12 canvas, hover/selected ring)
  └─ Click a card → goes to Page 3

PAGE 3: Ready to build
  ├─ Selected sprite preview
  ├─ Headline: "Ready to create your game?"
  ├─ [Yes, let's go]   [Pick a different variant] (back to P2)   [Start over] (back to P1)
```

## What gets hidden from the user

The current UI exposes a lot of internal machinery that should be tucked away:

- The 4-step pipeline tracker ("Sanitize", "Send to Nano Banana", etc.) → removed from the main flow. Replaced with a simple progress indicator (1 · 2 · 3) at the top of the page and a clean loading state on Page 1 while generating.
- The "Sanitizer system prompt", "Sanitized descriptor", and "Final image prompt" boxes under each variant → moved behind a collapsible "Show technical details" toggle on Page 2 (off by default), so power users can still inspect them.
- The Auto Cutout / Magic Lasso panel → moved off the variant grid; only appears on Page 3 for the chosen sprite (it's a post-selection action, not a comparison tool).
- "Option B — Balanced" / "Option C — Max Likeness" labels → renamed to neutral "Variant 1" / "Variant 2" as requested.

## State model

A single `step: 1 | 2 | 3` plus the existing `result` and a new `selectedVariant: "B" | "C" | null`. No data fetching changes. Errors still surface inline; if generation fails we stay on Page 1.

## Files to change

- `src/routes/index.tsx` — rewrite the component to render one of three views based on `step`. Keep `generateSprite` call, payload shape, and `Variant`/`Result` types untouched. Move `VariantCard` into a smaller `VariantPreview` (image + select button) for Page 2, and a `SelectedVariantPanel` (image + cutout + technical details) for Page 3.
- No backend changes. No changes to `src/server/sprite.functions.ts` or `src/components/AutoCutout.tsx`.

## Visual notes

- Top of every page: small "Step 1 of 3 · Describe" / "Step 2 of 3 · Choose" / "Step 3 of 3 · Confirm" header so users always know where they are.
- Page 2 cards use a subtle ring on hover and a stronger primary ring when selected.
- Page 3 "Yes, let's go" is a placeholder primary CTA (no game-creation backend exists yet) — clicking it can show a toast like "Game builder coming soon" so the flow feels complete.
