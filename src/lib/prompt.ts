// src/lib/prompts.ts

// ---------- Types ----------
export type SoundCategory =
  | "drum_loop"
  | "drum_one_shot"
  | "synth_timbre"
  | "texture"
  | "lead_line";

export type GlobalMusicSettings = {
  bpm: number;        // e.g., 120
  key: string;        // e.g., "C minor" or "A"
  loopLength: number; // bars (integer)
};

// ---------- Shared System Prompt ----------
/**
 * The LLM must output ONE line: a comma-separated list of nouns/adjectives only,
 * ordered from most important to least important, <= 12 tokens.
 * No verbs, no sentences, no JSON, no code fences.
 * Do NOT include category words, BPM, key, or loop length.
 */
export const SYSTEM_PROMPT = `
You are a sound design assistant for ThingBeat, an interactive music application that transforms webcam snapshots of physical objects into unique, playable sounds.

HOW IT WORKS:
1. A user shows an object to their webcam and selects a sound category
2. You analyze the image and create a concise descriptor capturing the object's sonic character
3. Your descriptor is sent to ElevenLabs Sound Effects API to generate the actual audio
4. The user plays and performs with the generated sound in a musical context

YOUR GOAL:
Create descriptors that produce INTERESTING and RECOGNIZABLE sounds. The user should hear something in the generated audio that connects back to the object they showed. This connection can be:
- Material qualities (wood, metal, glass, fabric, etc.)
- Physical characteristics (size, texture, density, shape)
- Acoustic properties (resonance, brightness, dampening)
- Character and mood (aggressive, playful, mysterious, industrial)
- Movement qualities (flowing, sudden, rhythmic, erratic)

The descriptor should inspire ElevenLabs to create sounds that are musically useful and creatively compelling, not generic or boring.

STRICT OUTPUT FORMAT:
- Output ONE LINE ONLY: comma-separated tokens
- Tokens must be NOUNS or ADJECTIVES only
- Order tokens from most important to least important
- Maximum 12 tokens total
- Do NOT include category words (e.g., "drum loop", "synth"), BPM, key, or loop length
- No prose, no JSON, no explanations, no quotes, no code fences

Examples of valid outputs:
- "wood, hollow, deep, resonant, warm, organic"
- "glass, bright, fragile, shimmer, crystalline, sharp"
- "metal, industrial, cold, harsh, ringing, mechanical"
`;

// ---------- Category-Specific User Prompts ----------
/**
 * Each one tells the model what kind of sound description to generate.
 * The *image* is always attached separately when calling the LLM API.
 */
const USER_PROMPT_TEMPLATES: Record<SoundCategory, string> = {
  drum_loop: `
CATEGORY: drum_loop
TASK:
Analyze the object and create a descriptor for a drum loop that captures its physical character and cultural/temporal associations.

FOCUS ON:
- Groove feel: tight, loose, swinging, straight, bouncy, driving, laid-back
- Texture: crisp, trashy, muddy, clean, gritty, polished, vintage, lo-fi
- Energy: aggressive, gentle, energetic, sparse, dense, dynamic
- Material character: woody, metallic, organic, synthetic, hollow, solid
- Production style: modern, vintage, raw, processed, analog, digital

EXAMPLES:
- Vintage camera → "vintage, jazz, warm, loose, brushed, organic, soft"
- Plastic toy → "playful, bright, tight, synthetic, bouncy, cheap, colorful"
- Metal toolbox → "industrial, harsh, metallic, heavy, aggressive, mechanical"
`,

  drum_one_shot: `
CATEGORY: drum_one_shot
TASK:
Analyze the object and create a descriptor for a single percussive hit. Describe the material, impact character, and sonic qualities.

IMPORTANT: If the object suggests a specific drum type (kick, snare, clap, hi-hat, rim, tom, etc.), include this descriptor as the LAST word.

FOCUS ON:
- Material: wood, metal, plastic, glass, fabric, leather, ceramic
- Impact: hard, soft, sharp, blunt, bouncy, dead, resonant
- Tonal quality: deep, high, warm, cold, bright, dark, hollow, solid
- Resonance: short, long, ringing, damped, dry, wet
- Character: punchy, subtle, aggressive, delicate, crisp, dull

EXAMPLES:
- Coffee mug → "ceramic, hollow, bright, ringing, medium, rim"
- Leather wallet → "soft, dead, warm, muted, thick, clap"
- Empty cardboard box → "cardboard, hollow, deep, dry, resonant, kick"
`,

  synth_timbre: `
CATEGORY: synth_timbre
TASK:
Analyze the object's character and create a descriptor for a synthesizer timbre (NOT a melody or rhythm).

FOCUS ON:
- Tonal character: warm, cold, bright, dark, rich, thin, fat, hollow
- Harmonic content: simple, complex, harsh, smooth, clean, distorted, evolving
- Envelope: soft, sharp, plucky, sustained, swelling, decaying
- Movement: static, wobbling, pulsing, breathing, morphing, filtered
- Synthesis character: analog, digital, FM, wavetable, vintage, modern
- Mood: aggressive, gentle, mysterious, playful, dark, ethereal

EXAMPLES:
- Glass bottle → "glass, bright, resonant, hollow, simple, ringing, ethereal"
- Old book → "vintage, warm, soft, analog, dusty, mellow, nostalgic"
- Smartphone → "digital, cold, precise, modern, clean, sharp, artificial"
`,

  texture: `
CATEGORY: texture
TASK:
Analyze the object and imagine an evolving ambient soundscape that captures its essence, environment, or emotional quality.

FOCUS ON:
- Spatial qualities: wide, narrow, deep, shallow, close, distant, vast, intimate
- Movement: static, evolving, flowing, pulsing, swirling, drifting, breathing
- Density: sparse, dense, airy, thick, layered, minimal
- Emotional character: dark, peaceful, tense, dreamy, melancholic, uplifting, mysterious
- Temporal quality: slow, gradual, suspended, frozen, expanding
- Natural vs synthetic: organic, mechanical, natural, artificial, processed

EXAMPLES:
- Houseplant → "organic, peaceful, slow, breathing, natural, verdant, alive"
- City skyline → "urban, vast, distant, mechanical, evolving, industrial, cold"
- Vintage photograph → "nostalgic, faded, distant, melancholic, dusty, fragile, suspended"
`,

  lead_line: `
CATEGORY: lead_line
TASK:
Analyze the object and create a descriptor for a melodic lead line. START with a single genre term based on the object's character, historical period, cultural associations, or use context (EXCEPT for obviously modern objects).

FOCUS ON:
- Genre (MUST BE FIRST): jazz, classical, folk, blues, electronic, rock, funk, soul, reggae, latin, baroque, romantic, etc.
- Articulation: staccato, legato, smooth, choppy, flowing, detached, connected
- Tonal character: bright, warm, nasal, breathy, reedy, rich, thin, full
- Expressiveness: emotional, mechanical, expressive, dry, vibrato, sliding, bending
- Instrument character: brass-like, string-like, wind-like, synthetic, acoustic

EXAMPLES:
- Vintage typewriter → "jazz, mechanical, staccato, bright, percussive, playful"
- Wooden flute → "folk, breathy, soft, flowing, warm, organic, airy"
- Neon sign → "electronic, bright, pulsing, synthetic, cold, modern, sharp"
`,
};

// ---------- Builder for the Claude API user prompt ----------
export function buildUserPrompt(category: SoundCategory): string {
  return USER_PROMPT_TEMPLATES[category].trim();
}

// ---------- ElevenLabs Prompt Assembly ----------
/**
 * Takes the LLM's single-line descriptor (nouns/adjectives) and appends category,
 * BPM, key, and loop length where appropriate.
 *
 * Examples:
 *   drum_loop     -> "drum loop, bpm:120, wood, harshly, round, deep"
 *   drum_one_shot -> "drum one shot, metal, brightness, ping, dryness"
 *   synth_timbre  -> "synth, key:C minor, warmth, glass, shimmer"
 *   texture       -> "texture, air, distance, shimmer, softly"
 *   lead_line     -> "lead line, key:C, bpm:120, brightness, clarity, glide"
 */
export function buildElevenLabsPrompt(
  category: SoundCategory,
  llmDescriptor: string, // The LLM's ONE-LINE output
  globals: GlobalMusicSettings
): string {
  const clean = sanitizeDescriptor(llmDescriptor);

  switch (category) {
    case "drum_loop":
      return joinCSV(["drum loop", `bpm:${globals.bpm}`, clean]);

    case "drum_one_shot":
      return joinCSV(["drum one shot", clean]);

    case "synth_timbre":
      return joinCSV(["single synth pluck", `key:${globals.key}`, clean]);

    case "texture":
      return joinCSV(["texture", clean]);

    case "lead_line":
      return joinCSV(["lead melody", `key:${globals.key}`, `bpm:${globals.bpm}`, clean]);

    default:
      return clean;
  }
}

// ---------- Helpers ----------
function sanitizeDescriptor(s: string): string {
  // Normalize commas and spaces
  const oneLine = s.replace(/\s+/g, " ").trim();
  const noTrailingComma = oneLine.replace(/,\s*$/g, "");
  const cleanCommas = noTrailingComma
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ");
  return cleanCommas;
}

function joinCSV(parts: string[]): string {
  return parts
    .map(p => p.trim())
    .filter(Boolean)
    .join(", ")
    .replace(/\s*,\s*/g, ", ");
}

// ---------- Export keys ----------
export const CATEGORY_KEYS: SoundCategory[] = [
  "drum_loop",
  "drum_one_shot",
  "synth_timbre",
  "texture",
  "lead_line",
];

// ---------- Export prompts for testing ----------
export const CATEGORY_PROMPTS: Record<SoundCategory, { system: string; user: string }> = {
  drum_loop: {
    system: SYSTEM_PROMPT.trim(),
    user: USER_PROMPT_TEMPLATES.drum_loop.trim(),
  },
  drum_one_shot: {
    system: SYSTEM_PROMPT.trim(),
    user: USER_PROMPT_TEMPLATES.drum_one_shot.trim(),
  },
  synth_timbre: {
    system: SYSTEM_PROMPT.trim(),
    user: USER_PROMPT_TEMPLATES.synth_timbre.trim(),
  },
  texture: {
    system: SYSTEM_PROMPT.trim(),
    user: USER_PROMPT_TEMPLATES.texture.trim(),
  },
  lead_line: {
    system: SYSTEM_PROMPT.trim(),
    user: USER_PROMPT_TEMPLATES.lead_line.trim(),
  },
};
