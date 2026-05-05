# Plan: Three Sprite Variants in Step 3

Replace the single stretched-sprite preview in `StepThree` with a row of three labeled previews, each at the required 424×331 sprite-sheet size:

1. **Idle** — the stretched cutout as-is (current behavior).
2. **Hit** — same sprite with a giant red "X" overlaid on top of the avatar (representing being hit/dead).
3. **Jump** — same sprite with small spring graphics overlaid along the bottom edge (representing jumping).

The overlays are conceptual "layers" applied uniformly to every avatar — the same X / spring artwork regardless of which sprite was chosen.

## UI Changes (`src/routes/index.tsx` → `StepThree`)

- Keep all existing logic for cutout + stretching (`cutoutUrl`, `stretchedUrl`, the hidden `AutoCutout` driver, and the 424×331 stretch effect). No changes to the cutout pipeline.
- Replace the single preview `Card` with a responsive row of three `Card`s (stacked on mobile, side-by-side on md+). Each card contains:
  - A 424×331 checkerboard container showing the sprite.
  - A small caption beneath: "Idle", "Hit", "Jump".
- All three cards use the same `stretchedUrl` (falling back to `cutoutUrl`, then `variant.imageUrl`) as the base layer.
- Overlays are absolutely positioned inside the card on top of the base `<img>`.

```text
┌──────────┐  ┌──────────┐  ┌──────────┐
│  sprite  │  │ sprite+X │  │ sprite+⚙⚙│
│  (Idle)  │  │  (Hit)   │  │  (Jump)  │
└──────────┘  └──────────┘  └──────────┘
```

- Container width on the page expands; cards may scale down visually on smaller viewports via `max-width: 100%` while preserving aspect ratio (`aspect-ratio: 424 / 331`). Native pixel size of the underlying canvas/image stays 424×331 for downloads.

## Overlay Implementation

Two new lightweight presentational subcomponents inside `index.tsx`:

- `XOverlay` — an absolutely-positioned SVG that draws two thick diagonal strokes spanning the full 424×331 frame, in a bold red (e.g. `#dc2626`) with slight stroke opacity, `pointer-events: none`. Sized `100%/100%` so it scales with the card.
- `SpringsOverlay` — an absolutely-positioned SVG anchored to the bottom of the frame, drawing 3–4 small coil/spring shapes (simple zig-zag or stacked-loop paths) evenly spaced along the bottom ~20% of the height. Neutral metallic gray (`#6b7280`) with darker outline. Also `pointer-events: none`.

Both overlays are pure SVG inline in JSX — no new assets, no extra dependencies.

## Advanced Tools Section

- The existing "advanced tools" download link continues to download the plain stretched cutout (`stretchedUrl`). Overlay variants are display-only for now — no separate download buttons (can be added later if requested).
- The existing manual `AutoCutout` editor remains unchanged.

## Files to Edit

- `src/routes/index.tsx` — modify `StepThree`; add `XOverlay` and `SpringsOverlay` components in the same file.

No new dependencies, no server changes, no route changes.
