import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SANITIZE_SYSTEM = `You are an input-sanitization assistant for a 2D game asset pipeline.

Take raw user input (which may include real people, copyrighted characters, or brands) and convert it into a SAFE, ORIGINAL, NON-INFRINGING descriptor.

RULES:
- Strip all proper nouns (names of people, characters, brands, franchises)
- NEVER output the original name or any copyrighted/real-person name
- NEVER say "in the style of" or reference specific IP
- Identify the underlying archetype, traits, and visual signals
- Convert into: role, physical traits (hair/shape/size/silhouette), clothing/accessories, emotional tone, exaggerated caricature-friendly features
- Always produce a clearly original reinterpretation

Return ONLY the sanitized descriptor as a single sentence. No explanations, no quotes, no labels.`;

function buildImagePrompt(descriptor: string, isHuman: boolean) {
  const subjectRule = isHuman
    ? `HUMAN SUBJECT RULE:
- Generate head and upper shoulders only
- Face should occupy 75–85% of canvas height
- Emphasize hair shape, face shape, expression, and clothing cues
- Do not generate a full body`
    : `NON-HUMAN SUBJECT RULE:
- Use a compact side-facing sprite suitable for a Flappy-style game
- Fill 90–95% of the canvas`;

  return `Create a satirical 2D arcade sprite based on this sanitized character archetype:

"${descriptor}"

GOAL:
- Make the character immediately recognizable as the intended public archetype through exaggerated visual cues
- Use caricature exaggeration, not realism
- Preserve the most iconic public-facing traits from the descriptor
- Do not include names, logos, brand marks, slogans, or copyrighted symbols

STYLE:
- Bold cartoon caricature
- Flat vector game art
- Thick black outline
- Simple shapes
- High readability at small size
- Minimal shading; no gradients

FRAMING:
- Canvas: 424 × 331 px
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping
- No border, no watermark, no text

${subjectRule}`;
}

export const generateSprite = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      input: z.string().trim().min(1).max(200),
      isHuman: z.boolean().default(false),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    // STEP 2: Sanitize
    const sanitizeRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SANITIZE_SYSTEM },
          { role: "user", content: data.input },
        ],
      }),
    });

    if (!sanitizeRes.ok) {
      const text = await sanitizeRes.text();
      throw new Error(`Sanitize failed [${sanitizeRes.status}]: ${text}`);
    }

    const sanitizeJson = await sanitizeRes.json();
    const descriptor: string = sanitizeJson.choices?.[0]?.message?.content?.trim() ?? "";
    if (!descriptor) throw new Error("Empty sanitized descriptor");

    const imagePrompt = buildImagePrompt(descriptor, data.isHuman);

    // STEP 3: Generate image via Nano Banana
    const imageRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!imageRes.ok) {
      const text = await imageRes.text();
      throw new Error(`Image generation failed [${imageRes.status}]: ${text}`);
    }

    const imageJson = await imageRes.json();
    const imageUrl: string | undefined =
      imageJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) throw new Error("No image returned from model");

    // STEP 4: Return
    return { descriptor, imagePrompt, imageUrl };
  });
