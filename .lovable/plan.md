## Goal
Add a right-facing orientation requirement to all 4 image generation prompts and reflect the change in documentation.

## Changes

### 1. `src/server/sprite.functions.ts` — update 4 prompt builders
- `buildImagePromptB` (text → variant B)
- `buildImagePromptC` (text → variant C)
- `buildImageRedrawPromptB` (image → variant B)
- `buildImageRedrawPromptC` (image → variant C)

In each prompt's FRAMING section, replace the existing line:
```
- Use a compact, side-facing sprite suitable for a Flappy-style game
```
(or `- Side-facing sprite suitable for Flappy-style gameplay` in the C variants)

with:
```
- Use a compact RIGHT-facing side-profile sprite suitable for a Flappy-style game

IMPORTANT:
- The sprite should visually appear to be moving from LEFT → RIGHT across the screen.
- Never face LEFT.
```

### 2. `.lovable/ai-prompts.md` — update the mirrored copies of all 4 prompts to include the same right-facing block, so the documentation matches the source.

### 3. `.lovable/plan.md` — update any prompt-related summary to note that all variants must be RIGHT-facing (left → right movement, never left-facing).

## Out of scope
- No changes to sanitizer prompts (no orientation guidance there).
- No UI, sprite-sheet pipeline, or AutoCutout changes.
