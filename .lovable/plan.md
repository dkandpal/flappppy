# Sprite Forge — Build-from-Scratch Requirements

A 3-step web app that turns a user's photo or text prompt into an original 2D game sprite, then composites it into a Flappy-style sprite sheet.

## User Flow (the only flow)

```
Step 1: Describe          Step 2: Choose            Step 3: Confirm
─────────────────         ──────────────            ─────────────────
Upload Image (default)    See 2 sprite variants     Background removed
   OR                     side-by-side              Stretched to slot size
Text Prompt               Click one to pick         Composited into sheet
[Generate] →                       →                Download sprite sheet PNG
```

No accounts, no persistence, no routing beyond `/`. Refreshing the page resets the flow to Step 1.

---

## Tech Stack

- **Framework**: TanStack Start v1 (React 19 + Vite 7)
- **Styling**: Tailwind v4 via `src/styles.css` with semantic OKLCH tokens; dark theme by default
- **UI primitives**: shadcn/ui (Button, Card, Input, Label, Textarea, Slider), `lucide-react` icons, `sonner` toasts
- **Server**: TanStack `createServerFn` (no Edge Functions)
- **AI**: Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
  - Sanitizer: `google/gemini-2.5-flash`
  - Image generator: `google/gemini-2.5-flash-image` (modalities: `["image","text"]`)
  - Auth: `LOVABLE_API_KEY` env var (server only)

---

## Step 1 — Describe

A single Card with a 2-tab segmented control. **Default tab: Upload Image.**

**Upload Image tab**
- Dashed drop-zone that opens a file picker on click
- Accept: `image/png, image/jpeg, image/webp`; max 8 MB
- On select: read as data URL, show 80×80 thumbnail with "Remove" button
- Validation: reject >8 MB with inline error

**Text Prompt tab**
- Textarea, 5 rows, `maxLength=400`, placeholder example provided

**Generate button**
- Disabled until input is valid (file present OR non-empty trimmed prompt)
- During request: shows "Generating your sprites…" + helper "This usually takes 10–20 seconds."
- On success → advance to Step 2; on error → red Card with message, stay on Step 1

## Step 2 — Choose

- Heading "Pick your favorite" + "Start over" ghost button
- 2-column grid (stacks on mobile) of variant cards
  - Each card: 17:12 white tile with `object-contain` sprite preview
  - Hover: brand border + slight scale; click anywhere on the tile or "Choose this →" to pick
- Collapsible "Show technical details" reveals per-variant: sanitized descriptor, image prompt, sanitizer system prompt
- Selecting a variant → advance to Step 3

## Step 3 — Confirm / Sprite Sheet

Pipeline (all client-side, runs automatically):

1. **Background cutout** of selected variant via `AutoCutout` (run hidden, `autoRun`, tolerance 25, padding 0). Outputs transparent PNG.
2. **Stretch** cutout to `424×331` (sprite slot size) onto a canvas.
3. **Composite** into `/public/flappy_1.png` (`1720×2690`):
   - `bird.png` slot at `(1059, 543)` size `424×331` — stretched sprite
   - `bird_crashed.png` slot at `(15, 2384)` size `390×291` — stretched sprite + red X overlay (`rgba(220,38,38,0.85)`, lineWidth 36, rounded caps, 40px inset)
4. Display two previews ("Idle" and "Hit" with red-X SVG overlay), then the full merged sprite sheet on a checkerboard background.
5. Provide "Download sprite sheet PNG" link.

CTA buttons: "Yes, let's create my game →" (toast placeholder), "Pick a different variant" (back to Step 2), "Start over" (reset).

Hidden "Show advanced tools" expands a visible `AutoCutout` panel with tolerance/padding sliders + cutout download.

---

## Server Function: `generateSprite`

`src/server/sprite.functions.ts` exports one server fn:

- Input (Zod): `{ input?: string (≤200 chars), referenceImage?: string starts with "data:image/" }` — must have at least one
- Reads `process.env.LOVABLE_API_KEY` **inside `.handler()`** (never module scope)
- Runs **two variants in parallel** (`Promise.all`) with different prompt strategies:
  - **Variant B**: "moderate caricature" sanitizer + image prompt
  - **Variant C**: "extreme caricature" sanitizer + image prompt
- **Text path**: sanitize input → text-to-image (no reference)
- **Image path**: skip sanitizer, send the user image as `image_url` content alongside a "redraw as sprite" prompt
- Both paths constrain output: 510×360 canvas, pure white `#FFFFFF` bg, subject fills 90–95%, thick black outlines, flat vector caricature, no text/borders
- Retry up to 3 times on transient failures with backoff; surface 429/402 immediately
- Returns `{ optionB: Variant, optionC: Variant }` where `Variant = { sanitizerPrompt, descriptor, imagePrompt, imageUrl }`

Sanitizer rules (critical for safety): strip proper nouns, brands, copyrighted IP; preserve recognizability via traits and exaggeration; never echo names.

---

## AutoCutout Component

`src/components/AutoCutout.tsx` — pure client-side background remover for white backgrounds:

1. `buildMask` — pixel is bg if alpha<8 OR all RGB > (255 − tolerance)
2. `cleanMask` — morphological open then close (4-neighbor erode/dilate)
3. `keepLargestComponent` — connected-component flood-fill, keep biggest
4. `fillHoles` — flood from edges; unreachable bg → foreground (preserves eyes)
5. Bounding box + optional padding, output transparent PNG via `canvas.toDataURL`
6. Optional Moore-neighbor contour trace + RDP simplify for marching-ants overlay
7. Props: `imageUrl, filename, autoRun, defaultTolerance, defaultPadding, onCutoutReady`

---

## Design System (`src/styles.css`)

- Dark theme baseline (apply `class="dark"` on `<html>` in root shell)
- All colors in **OKLCH**, registered in `@theme inline` so Tailwind utilities work
- Semantic tokens: `background`, `foreground`, `card`, `muted`, `border`, `primary`, `primary-foreground`, `destructive`, plus a custom `--brand` (cyan-ish `oklch(0.85 0.16 200)`) used for CTAs, active step indicator, logo
- Components must use semantic classes (`bg-brand`, `text-muted-foreground`) — no hardcoded hex

## Layout Chrome

- Sticky top bar: hamburger + "Sprite Forge" wordmark + avatar circle
- Centered max-w-3xl column, padded
- StepIndicator: 3 numbered chips (Describe / Choose / Confirm) with connector lines; active chip uses `bg-brand` + glow shadow; completed chips dimmed brand
- Big centered H1: "Make your game sprite\nin 3 steps"

---

## File Structure

```
src/
  routes/
    __root.tsx          # HTML shell, dark class, head meta, NotFound
    index.tsx           # Entire 3-step UI (Index, TopBar, StepIndicator,
                        #   StepOne, StepTwo, VariantChoice, StepThree, XOverlay)
  server/
    sprite.functions.ts # generateSprite serverFn + sanitize/generateImage helpers
  components/
    AutoCutout.tsx      # Background removal + cutout
    ui/                 # shadcn primitives
  styles.css            # Design tokens
public/
  flappy_1.png          # Base 1720×2690 Flappy sprite sheet
```

`routeTree.gen.ts` is auto-generated — do not hand-edit.

---

## Constants Reference

| Name | Value | Purpose |
|---|---|---|
| `SPRITE_W × SPRITE_H` | 424 × 331 | bird.png slot dimensions |
| `SHEET_W × SHEET_H` | 1720 × 2690 | base sprite sheet size |
| `BIRD_X, BIRD_Y` | 1059, 543 | idle slot top-left |
| `CRASHED_X, CRASHED_Y` | 15, 2384 | crashed slot top-left |
| `CRASHED_W × CRASHED_H` | 390 × 291 | crashed slot dimensions |
| Image gen canvas | 510 × 360 | matches 17:12 preview aspect |
| Max upload | 8 MB | client-side guard |
| Max text input | 200 chars (server) / 400 (client UI) | aligns with Zod |

---

## Acceptance Criteria

- Loading `/` shows Step 1 with **Upload Image active by default**
- Generating from either input mode produces 2 distinct sprite variants on white
- Clicking a variant shows the cutout (no white halo) stretched to 424×331 in both Idle and Hit cards
- The merged sprite sheet preview matches `flappy_1.png` exactly except for the two replaced slots
- Download link yields a 1720×2690 PNG
- No proper nouns or brand marks ever appear in returned `descriptor` or `imagePrompt`
- `LOVABLE_API_KEY` is never referenced at module scope or in client code
- Dark theme renders with brand cyan accents; no raw hex colors in components
