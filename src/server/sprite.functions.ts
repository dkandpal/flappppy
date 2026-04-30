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
  const subjectRules = isHuman
    ? `SUBJECT RULES (HUMAN): Head and shoulders only. Slight right-facing angle. Large expressive face. Fill frame 90-95%.`
    : `SUBJECT RULES (NON-HUMAN): Side profile facing right. Compact, floating body shape. Avoid thin limbs or complex detail.`;

  return `Create a single original 2D game sprite using this description: "${descriptor}".

STRICT REQUIREMENTS:
- ORIGINALITY: Must be fully original and not resemble any specific real person or copyrighted character. Only evoke a general archetype.
- STYLE: Simple, playful, mobile arcade aesthetic. Flat colors, bold outlines, minimal shading. Rounded, chunky proportions. Clean silhouette readable at small sizes.
- COMPOSITION: Solid white background (RGB 255,255,255). Subject centered. Subject fills 90-95% of canvas with 2-5% padding. No cropping. No shadows, no background elements.
- BOUNDING BOX: The subject MUST visually touch an invisible bounding box inset 10px from each edge of the canvas. The subject's silhouette must extend to and contact all four sides of this inset box (top, bottom, left, right).
- SIZE ENFORCEMENT: If the subject does not fill at least 90% of the canvas, regenerate. Do not produce small or floating-in-space subjects under any circumstances.
- ${subjectRules}
- OUTPUT: Clean sprite ready for atlas use. No text, watermark, or borders.`;
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
