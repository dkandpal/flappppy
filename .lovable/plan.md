## Redesign Step 1 — Dark "Sprite Forge" theme

Match the uploaded mockups: dark navy background, cyan accent brand, top app bar, restyled stepper, bold hero, and a refreshed "Describe your character" card with a textarea + cloud-icon upload zone.

### Visual direction
- **Theme**: dark mode by default. Background near-black navy, elevated cards a touch lighter, subtle borders.
- **Accent**: bright cyan (`oklch` token) for the brand wordmark, the active step pill, and primary affordances.
- **Typography**: large, bold hero ("Make your game sprite in 3 steps"), small uppercased section labels with wide tracking ("DESCRIBE YOUR CHARACTER", "REFERENCE IMAGE", "PROMPT SPECIFICATION").

### Layout changes (`src/routes/index.tsx` + `src/styles.css`)

1. **Top app bar** (new, above header)
   - Left: hamburger icon + cyan "Sprite Forge" wordmark.
   - Right: circular avatar placeholder.
   - Sticky, transparent over page background.

2. **Stepper redesign**
   - Three rounded-square chips (1 / 2 / 3) connected by a thin divider line.
   - Active step: filled cyan with dark number; completed: muted cyan; upcoming: dark gray.
   - Label ("Describe / Choose / Confirm") sits *below* each chip, centered.

3. **Hero**
   - Centered, two-line bold heading. Remove the small "Sprite Forge" eyebrow (now in app bar).

4. **Step 1 card refresh**
   - Card uses elevated dark surface with soft border.
   - Section label "DESCRIBE YOUR CHARACTER" in uppercase tracking.
   - Toggle (Text Prompt / Upload Image): segmented pill, selected = lighter dark fill with white text, unselected = transparent muted.
   - **Text mode**: replace single-line `Input` with a multi-line textarea labeled "PROMPT SPECIFICATION", placeholder "Type an idea... e.g. A cybernetic rogue with glowing orange visor and weathered tactical gear, 2D pixel art style." Small info (ⓘ) icon bottom-right inside the field.
   - **Upload mode**: large dashed dropzone with centered cyan cloud-upload icon, "Click or drag image to upload", subtext "PNG, JPG up to 10MB". Clicking opens the file picker (hidden `<input type="file">`).
   - Generate button stays full-width below.

5. **Steps 2 & 3** keep their current functionality but inherit the new dark tokens automatically (cards, borders, text). No structural changes.

### Design tokens (`src/styles.css`)
- Set `:root` to dark values (or force `.dark` on `<html>`):
  - `--background`: deep navy (~`oklch(0.18 0.02 250)`)
  - `--card`: slightly lighter navy
  - `--border`: low-contrast cool gray
  - `--primary`: cyan (~`oklch(0.82 0.15 200)`) with dark `--primary-foreground`
  - `--muted-foreground`: cool gray
- Add a `--brand` cyan token for the wordmark + active step.

### Out of scope
- No changes to sprite generation logic, server functions, or `AutoCutout`.
- Existing Step 3 overlays (Idle / Hit) untouched.

### Technical notes
- Force dark theme by adding `class="dark"` on the root element in `__root.tsx` (or flipping `:root` tokens directly in `styles.css`).
- Use `lucide-react` icons (`Menu`, `UploadCloud`, `Info`) — already available via shadcn.
- Replace `Input` (text mode) with `Textarea` from `@/components/ui/textarea`.
- Avatar: circular `<div>` with a placeholder image (or initials) — no auth wiring.
