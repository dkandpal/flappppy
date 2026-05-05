## Goal

On Step 3 ("Ready to create your game?"), display the **transparent-background cutout** of the selected sprite as the main image, automatically generated using **white tolerance = 25** and **padding = 0px**. No clicks required.

## Changes

### 1. `src/components/AutoCutout.tsx` — add auto-run + callback props

Add three optional props:
- `defaultTolerance?: number` — initial tolerance (defaults to current 10)
- `defaultPadding?: number` — initial padding (defaults to current 8)
- `autoRun?: boolean` — when true, run `runDetection()` once after the source image loads
- `onCutoutReady?: (dataUrl: string) => void` — fires whenever a new cutout PNG is produced

Behavior:
- Initialize `tolerance`/`padding` state from the new defaults.
- After the image finishes loading and `imgSize` is set, if `autoRun` is true, call `runDetection()` once.
- Inside `runDetection`, after `setCutoutDataUrl(dataUrl)`, also call `onCutoutReady?.(dataUrl)`.

Existing manual UI (sliders, button, downloads) stays unchanged — the component still works as today when those props are omitted.

### 2. `src/routes/index.tsx` — `StepThree` shows the cutout

- Add local state `const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);`
- Replace the main `<img src={variant.imageUrl} …>` Card with:
  - A checkerboard-styled container (light gray + white tiles via a CSS background) so transparency is visible.
  - `<img src={cutoutUrl ?? variant.imageUrl}>` — falls back to the original until the cutout is ready.
  - A small caption: "Background removed automatically" (or a subtle spinner while `cutoutUrl` is null).
- Render an **always-mounted but visually hidden** `AutoCutout` that drives the cutout:
  ```tsx
  <div className="sr-only" aria-hidden>
    <AutoCutout
      imageUrl={variant.imageUrl}
      filename="sprite-cutout.png"
      autoRun
      defaultTolerance={25}
      defaultPadding={0}
      onCutoutReady={setCutoutUrl}
    />
  </div>
  ```
- The "Show advanced tools" section keeps its own visible `<AutoCutout>` for manual tweaking/downloading (unchanged), but its defaults are also bumped to `defaultTolerance={25}` `defaultPadding={0}` for consistency.
- "Download PNG" button in advanced tools: switch its `href` to `cutoutUrl ?? variant.imageUrl` and rename to "Download cutout PNG" so the primary download matches what's shown.

## Notes

- Fully client-side; no backend or API changes.
- If detection finds no foreground (blank/all-white image), `cutoutUrl` stays null and the original image is shown as a graceful fallback.
- Step 1, Step 2, and the generation pipeline are untouched.
