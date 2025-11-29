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
 * No verbs, no adjectives, no sentences, no JSON, no code fences.
 * Do NOT include category words, BPM, key, or loop length.
 */
export const SYSTEM_PROMPT = `
You are a sound design assistant. 
Given an image of an object and a chosen sound category,
produce a concise, comma-separated descriptor string for an audio generator.

STRICT RULES:
- Output ONE LINE ONLY: comma-separated tokens.
- Tokens must be NOUNS or ADJECTIVES.
- Order tokens from most important to least important.
- Maximum 12 tokens total.
- Do NOT include category words (e.g., "drum loop", "synth"), BPM, key, or loop length.
- No prose, no JSON, no explanations, no quotes, no code fences.

Examples of valid outputs:
- "wood, harshly, round, deep, quickly, dynamically"
- "glass, brightly, shimmer, thin, sharply, narrowly"
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
From the image, infer the percussive timbre and groove character suggested by the object (not the exact rhythm).
Output only nouns/adjectives representing sonic qualities relevant for a drum loop.
`,

  drum_one_shot: `
CATEGORY: drum_one_shot
TASK:
From the image, infer a single percussive hit’s timbral identity (material, impact, resonance).
Output only nouns/adjectives describing the hit character.
`,

  synth_timbre: `
CATEGORY: synth_timbre
TASK:
From the image, infer a synthesizer timbre inspired by the object’s character (no rhythm or melody). 
Personify the object and use adjectives to describe it and with those adjectives, describe a sound quality.
Output only nouns/adjectives capturing timbre.
`,

  texture: `
CATEGORY: texture
TASK:
From the image, analyse the object shown and infer the environment the object could be placed in, or the mood it could evoke. Use this to infer an evolving ambient texture inspired by the object. Use adjectives to describe the texture and with those adjectives, describe a sound quality.
Output only nouns/adjectives for ambience/space/motion. Be descriptive and poetic.
`,

  lead_line: `
CATEGORY: lead_line
TASK:
From the image, infer the melodic/lead character (tone and articulation vibe) inspired by the object—NOT actual notes. Include a single term that describes the most fitting genre of music that the object could be seen in.
Output only nouns/adjectives for melodic tone/shape/articulation.
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
      return joinCSV(["synth", `key:${globals.key}`, clean]);

    case "texture":
      return joinCSV(["texture", clean]);

    case "lead_line":
      return joinCSV(["lead line", `key:${globals.key}`, `bpm:${globals.bpm}`, clean]);

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
