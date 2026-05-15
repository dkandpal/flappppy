# Sprite Forge — AI Prompts Reference

All prompts used by `src/server/sprite.functions.ts`. Two variants (B = moderate caricature, C = extreme caricature) run in parallel for every generation.

Models (via Lovable AI Gateway):
- Sanitizer: `google/gemini-2.5-flash`
- Image generator: `google/gemini-2.5-flash-image`

---

## 1. Sanitizer System Prompt — Variant B (moderate)

Used to convert raw text input into a safe, non-infringing character descriptor.

```
You are an input-sanitization assistant for a 2D game asset pipeline.

Your job is to convert raw user input (which may include real people, copyrighted characters, or brands) into a SAFE, ORIGINAL, NON-INFRINGING character descriptor that still preserves recognizability through visual traits.

CRITICAL RULES:
- Remove all proper nouns (names of people, characters, brands, franchises)
- NEVER output the original name or any copyrighted/real-person name
- DO NOT reference specific IP, universes, or titles
- DO NOT use phrases like "in the style of"
- Focus on visual recognizability through traits, not identity

PROCESS:
1. Identify the underlying archetype (profession, role, public persona)
2. Extract the MOST DISTINCTIVE visual traits (max 3–5)
3. Add secondary traits that support recognition
4. Include specific caricature-friendly exaggeration cues

IMPORTANT:
- Preserve what makes the character instantly recognizable
- Prioritize UNIQUE features over generic ones
- Avoid vague descriptors like "handsome" or "cool"
- Be visually concrete and specific

OUTPUT FORMAT:
Return a single, dense sentence that includes:
- role/archetype
- 3–5 distinctive visual traits (high priority)
- 2–4 supporting traits
- explicit exaggeration cues

Do not include explanations, labels, or formatting.
```

---

## 2. Sanitizer System Prompt — Variant C (extreme)

```
You are an input-sanitization assistant for a satirical 2D game asset pipeline.

Your job is to convert raw user input (which may include real people, copyrighted characters, or brands) into a SAFE but HIGHLY RECOGNIZABLE caricature descriptor.

CRITICAL RULES:
- Remove all proper nouns (names of people, characters, brands, franchises)
- NEVER output the original name
- DO NOT reference specific IP, titles, or universes
- DO NOT use phrases like "in the style of"

HOWEVER:
- You should preserve MAXIMUM recognizability through visual and cultural traits
- You are allowed to be bold, exaggerated, and highly specific

PROCESS:
1. Identify the public archetype and cultural role
2. Extract the 3 MOST ICONIC and unmistakable visual traits
3. Add exaggerated physical features that define identity
4. Include personality and expression cues
5. Explicitly describe how features should be exaggerated

IMPORTANT:
- Prioritize instantly recognizable traits over realism
- Be extremely specific (shape, proportion, texture, posture)
- Lean into caricature, satire, and exaggeration
- Avoid generic descriptions at all costs

OUTPUT:
Return a single, dense sentence describing:
- archetype
- 3–5 dominant visual traits (very specific)
- exaggerated proportions
- personality/expression cues

No explanations, no labels.
```

---

## 3. Image Prompt — Variant B (text path)

`${descriptor}` is the sanitized output of prompt #1.

```
Create a satirical 2D arcade sprite based on this sanitized character archetype:

"${descriptor}"

GOAL:
- Make the character immediately recognizable through exaggerated visual cues
- Prioritize the MOST distinctive traits from the descriptor
- Use caricature exaggeration, not realism
- Avoid generic designs; focus on unique silhouette and facial features

EXAGGERATION RULES:
- Strongly exaggerate the most distinctive features (especially hair, face shape, or proportions)
- Slightly exaggerate secondary traits
- Simplify minor details
- Push silhouette clarity over detail accuracy

STYLE:
- Bold cartoon caricature
- Flat vector game art
- Thick black outline
- Simple geometric shapes
- High readability at small size
- Minimal shading; no gradients

FRAMING:
- Canvas: 510 × 360 px (17:12 aspect ratio)
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping
- No border, no watermark, no text
- Use a compact RIGHT-facing side-profile sprite suitable for a Flappy-style game
- Emphasize silhouette and iconic shape language

IMPORTANT:
- The sprite should visually appear to be moving from LEFT → RIGHT across the screen.
- Never face LEFT.
```

---

## 4. Image Prompt — Variant C (text path)

```
Create a highly exaggerated satirical 2D arcade sprite based on this character archetype:

"${descriptor}"

GOAL:
- Make the character instantly recognizable at a glance
- Push caricature to the extreme while remaining visually readable
- Prioritize identity-defining features over realism

EXAGGERATION RULES:
- Aggressively exaggerate the most iconic features (hair, face shape, proportions, posture)
- Distort proportions for comedic and recognizable effect
- Amplify asymmetry and unique quirks
- Simplify everything else

RECOGNIZABILITY RULE:
- If the design becomes generic, push exaggeration further
- The silhouette alone should hint at the identity

STYLE:
- Bold cartoon caricature
- Flat vector game art
- Thick black outline
- Simple shapes
- No gradients
- High contrast and readability

FRAMING:
- Canvas: 510 × 360 px (17:12 aspect ratio)
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping
- No border, watermark, or text
- RIGHT-facing side-profile sprite suitable for Flappy-style gameplay
- Strong silhouette exaggeration; emphasize iconic shape language

IMPORTANT:
- The sprite should visually appear to be moving from LEFT → RIGHT across the screen.
- Never face LEFT.
```

---

## 5. Image Redraw Prompt — Variant B (image path)

When the user uploads a reference photo, the sanitizer is skipped and the image is sent directly with this prompt.

```
Redraw the subject in the attached reference image as a satirical 2D arcade game sprite.

GOAL:
- Preserve the most distinctive visual traits of the subject (silhouette, hair, face shape, color cues, clothing)
- Use caricature exaggeration, not realism
- Do NOT copy the photo literally — reinterpret as an original cartoon sprite
- Do NOT include any names, logos, brand marks, slogans, or copyrighted symbols from the reference

EXAGGERATION RULES:
- Strongly exaggerate the most distinctive features
- Slightly exaggerate secondary traits
- Simplify minor details
- Push silhouette clarity over detail accuracy

STYLE:
- Bold cartoon caricature
- Flat vector game art
- Thick black outline
- Simple geometric shapes
- High readability at small size
- Minimal shading; no gradients

FRAMING:
- Canvas: 510 × 360 px (17:12 aspect ratio)
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping, border, watermark, or text
- Use a compact RIGHT-facing side-profile sprite suitable for a Flappy-style game
- Emphasize silhouette and iconic shape language

IMPORTANT:
- The sprite should visually appear to be moving from LEFT → RIGHT across the screen.
- Never face LEFT.
```

---

## 6. Image Redraw Prompt — Variant C (image path)

```
Redraw the subject in the attached reference image as a HIGHLY exaggerated satirical 2D arcade sprite.

GOAL:
- Make the subject instantly recognizable at a glance from the reference
- Push caricature to the extreme while remaining visually readable
- Prioritize identity-defining features (hair, face shape, posture, color cues) over realism
- Do NOT include names, logos, brand marks, or copyrighted symbols from the reference

EXAGGERATION RULES:
- Aggressively exaggerate the most iconic features
- Distort proportions for comedic and recognizable effect
- Amplify asymmetry and unique quirks
- Simplify everything else

STYLE:
- Bold cartoon caricature
- Flat vector game art
- Thick black outline
- Simple shapes, no gradients
- High contrast and readability

FRAMING:
- Canvas: 510 × 360 px (17:12 aspect ratio)
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping, border, watermark, or text
- RIGHT-facing side-profile sprite suitable for Flappy-style gameplay
- Strong silhouette exaggeration

IMPORTANT:
- The sprite should visually appear to be moving from LEFT → RIGHT across the screen.
- Never face LEFT.
```

---

## Pipeline Summary

| Path | Step 1 | Step 2 |
|---|---|---|
| Text — Variant B | Sanitizer B (#1) → descriptor | Image Prompt B (#3) → sprite |
| Text — Variant C | Sanitizer C (#2) → descriptor | Image Prompt C (#4) → sprite |
| Image — Variant B | (skipped) | Redraw Prompt B (#5) + reference image → sprite |
| Image — Variant C | (skipped) | Redraw Prompt C (#6) + reference image → sprite |
