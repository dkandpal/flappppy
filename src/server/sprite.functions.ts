import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SANITIZE_SYSTEM_B = `You are an input-sanitization assistant for a 2D game asset pipeline.

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

Do not include explanations, labels, or formatting.`;

const SANITIZE_SYSTEM_C = `You are an input-sanitization assistant for a satirical 2D game asset pipeline.

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

No explanations, no labels.`;

function buildImagePromptB(descriptor: string, isHuman: boolean) {
  const subjectRule = isHuman
    ? `HUMAN SUBJECT RULE:
- Generate head and upper shoulders only
- Face should occupy 75–85% of canvas height
- Strongly emphasize facial proportions (jaw, nose, eyes, hair silhouette)
- Allow asymmetry and caricature distortion
- Expression should reinforce personality
- Do not generate a full body`
    : `NON-HUMAN SUBJECT RULE:
- Use a compact, side-facing sprite suitable for a Flappy-style game
- Emphasize silhouette and iconic shape language
- Fill 90–95% of the canvas`;

  return `Create a satirical 2D arcade sprite based on this sanitized character archetype:

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
- Canvas: 424 × 331 px
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping
- No border, no watermark, no text

${subjectRule}`;
}

function buildImagePromptC(descriptor: string, isHuman: boolean) {
  const subjectRule = isHuman
    ? `HUMAN SUBJECT RULE:
- Head and upper shoulders only
- Face occupies 80–90% of canvas height
- Exaggerate facial proportions heavily (jaw size, nose shape, eye spacing, hair volume)
- Allow strong distortion if it improves recognizability
- Expression should be bold and personality-driven`
    : `NON-HUMAN SUBJECT RULE:
- Side-facing sprite suitable for Flappy-style gameplay
- Strong silhouette exaggeration
- Emphasize iconic shape language over detail
- Fill 90–95% of canvas`;

  return `Create a highly exaggerated satirical 2D arcade sprite based on this character archetype:

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
- Canvas: 424 × 331 px
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping
- No border, watermark, or text

${subjectRule}`;
}

async function sanitize(apiKey: string, system: string, input: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sanitize failed [${res.status}]: ${text}`);
  }
  const json = await res.json();
  const descriptor: string = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!descriptor) throw new Error("Empty sanitized descriptor");
  return descriptor;
}

async function generateImage(
  apiKey: string,
  prompt: string,
  referenceImage?: string,
): Promise<string> {
  const userContent = referenceImage
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: referenceImage } },
      ]
    : prompt;

  const maxAttempts = 3;
  let lastErr = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429 || res.status === 402) {
        throw new Error(`Image generation failed [${res.status}]: ${text}`);
      }
      lastErr = `HTTP ${res.status}: ${text}`;
      console.warn(`generateImage attempt ${attempt} failed: ${lastErr}`);
      await new Promise((r) => setTimeout(r, 600 * attempt));
      continue;
    }

    const json = await res.json();
    const imageUrl: string | undefined =
      json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (imageUrl) return imageUrl;

    const finishReason = json.choices?.[0]?.finish_reason;
    const textContent = json.choices?.[0]?.message?.content;
    lastErr = `no image (finish_reason=${finishReason ?? "unknown"}, text=${
      typeof textContent === "string" ? textContent.slice(0, 200) : "n/a"
    })`;
    console.warn(`generateImage attempt ${attempt} returned no image: ${lastErr}`);
    await new Promise((r) => setTimeout(r, 600 * attempt));
  }

  throw new Error(`No image returned from model after ${maxAttempts} attempts. Last: ${lastErr}`);
}

async function runVariant(
  apiKey: string,
  system: string,
  buildPrompt: (d: string, h: boolean) => string,
  input: string,
  isHuman: boolean,
) {
  const descriptor = await sanitize(apiKey, system, input);
  const imagePrompt = buildPrompt(descriptor, isHuman);
  const imageUrl = await generateImage(apiKey, imagePrompt);
  return { sanitizerPrompt: system, descriptor, imagePrompt, imageUrl };
}

function buildImageRedrawPromptB(isHuman: boolean) {
  const subjectRule = isHuman
    ? `HUMAN SUBJECT RULE:
- Generate head and upper shoulders only
- Face should occupy 75–85% of canvas height
- Strongly emphasize facial proportions (jaw, nose, eyes, hair silhouette)
- Allow asymmetry and caricature distortion
- Do not generate a full body`
    : `NON-HUMAN SUBJECT RULE:
- Use a compact, side-facing sprite suitable for a Flappy-style game
- Emphasize silhouette and iconic shape language
- Fill 90–95% of the canvas`;

  return `Redraw the subject in the attached reference image as a satirical 2D arcade game sprite.

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
- Canvas: 424 × 331 px
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping, border, watermark, or text

${subjectRule}`;
}

function buildImageRedrawPromptC(isHuman: boolean) {
  const subjectRule = isHuman
    ? `HUMAN SUBJECT RULE:
- Head and upper shoulders only
- Face occupies 80–90% of canvas height
- Exaggerate facial proportions heavily (jaw size, nose shape, eye spacing, hair volume)
- Allow strong distortion if it improves recognizability`
    : `NON-HUMAN SUBJECT RULE:
- Side-facing sprite suitable for Flappy-style gameplay
- Strong silhouette exaggeration
- Fill 90–95% of canvas`;

  return `Redraw the subject in the attached reference image as a HIGHLY exaggerated satirical 2D arcade sprite.

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
- Canvas: 424 × 331 px
- Pure white background #FFFFFF
- Subject fills 90–95% of the canvas
- Subject should touch an invisible bounding box inset 10 px from each edge
- No cropping, border, watermark, or text

${subjectRule}`;
}

async function runImageVariant(
  apiKey: string,
  imagePrompt: string,
  referenceImage: string,
) {
  const imageUrl = await generateImage(apiKey, imagePrompt, referenceImage);
  return {
    sanitizerPrompt: "(skipped — image input used directly as reference)",
    descriptor: "(image-based input — no text descriptor)",
    imagePrompt,
    imageUrl,
  };
}

export const generateSprite = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      input: z.string().trim().max(200).optional(),
      referenceImage: z.string().startsWith("data:image/").optional(),
      isHuman: z.boolean().default(false),
    })
      .refine((d) => !!d.input || !!d.referenceImage, {
        message: "Provide either text input or a reference image",
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    if (data.referenceImage) {
      const promptB = buildImageRedrawPromptB(data.isHuman);
      const promptC = buildImageRedrawPromptC(data.isHuman);
      const [optionB, optionC] = await Promise.all([
        runImageVariant(apiKey, promptB, data.referenceImage),
        runImageVariant(apiKey, promptC, data.referenceImage),
      ]);
      return { optionB, optionC };
    }

    const [optionB, optionC] = await Promise.all([
      runVariant(apiKey, SANITIZE_SYSTEM_B, buildImagePromptB, data.input!, data.isHuman),
      runVariant(apiKey, SANITIZE_SYSTEM_C, buildImagePromptC, data.input!, data.isHuman),
    ]);

    return { optionB, optionC };
  });

