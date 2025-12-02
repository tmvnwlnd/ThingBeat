// src/lib/sfx.ts (or inside prompts.ts if you prefer)

import { SoundCategory, GlobalMusicSettings, buildElevenLabsPrompt } from "./prompt";

export type SfxRequest = {
  text: string;             // Final prompt string for ElevenLabs
  duration_seconds: number; // Duration requested from ElevenLabs
  loop: boolean;            // Whether to enable loop smoothing
  model_id?: string;        // optional; defaults to "eleven_text_to_sound_v2"
  prompt_influence?: number;// optional; 0..1, defaults 0.3
};

export type SfxRequestWithFormat = {
  body: SfxRequest;
  queryParams: {
    output_format: string;  // e.g., "mp3_44100_128" - passed as query param
  };
};

/**
 * Build a request payload for ElevenLabs SFX API.
 * Applies the cost-saving rule: drum_loop duration is halved, and playback repeats twice.
 */
export function buildSfxRequest(
  category: SoundCategory,
  llmDescriptor: string,
  globals: GlobalMusicSettings,
  options?: {
    output_format?: string;
    model_id?: string;
    prompt_influence?: number;
  }
): SfxRequestWithFormat {
  // 1. Build text prompt from category + LLM output
  const text = buildElevenLabsPrompt(category, llmDescriptor, globals);

  // 2. Decide if loop smoothing should be requested
  const loop = category === "drum_loop" || category === "texture";

  // 3. Decide duration (halve if drum loop)
  // Here "full length" can be just a rough target you define elsewhere.
  // For now let's assume a default of 8 seconds unless specified by the app.
  const fullDuration = guessDefaultDuration(category, globals);
  const duration_seconds =
    category === "drum_loop" ? fullDuration / 2 : fullDuration;

  // 4. Get category-specific prompt influence (unless overridden in options)
  const prompt_influence = options?.prompt_influence ?? getCategoryPromptInfluence(category);

  // 5. Return the request object with separated body and query params
  return {
    body: {
      text,
      duration_seconds,
      loop,
      model_id: options?.model_id,
      prompt_influence,
    },
    queryParams: {
      output_format: options?.output_format ?? "mp3_44100_128",
    },
  };
}

/**
 * Calculate appropriate default duration for each sound category.
 * Based on BPM and loop length for rhythmic categories, fixed durations for others.
 */
function guessDefaultDuration(
  category: SoundCategory,
  globals: GlobalMusicSettings
): number {
  const { bpm, loopLength } = globals;

  // Calculate duration for one loop cycle in seconds
  // (bars * beats_per_bar * 60 seconds_per_minute) / bpm
  // Assuming 4/4 time signature (4 beats per bar)
  const loopDurationSeconds = (loopLength * 4 * 60) / bpm;

  switch (category) {
    case "drum_loop":
      // Full loop duration (will be halved by caller for API request)
      return loopDurationSeconds;

    case "drum_one_shot":
      // Short percussive hit
      return 1.5;

    case "synth_timbre":
      // Long enough to hear timbre characteristics when played across keys
      return 4.0;

    case "texture":
      // Long evolving ambient sound
      return 10.0;

    case "lead_line":
      // Match the loop length for melodic phrases
      return loopDurationSeconds;

    default:
      return 5.0;
  }
}

/**
 * Get category-specific prompt influence values.
 * Higher values = more closely follows prompt, less variation
 * Lower values = more creative/varied interpretations
 *
 * Range: 0.0 - 1.0 (default is 0.3)
 */
function getCategoryPromptInfluence(category: SoundCategory): number {
  switch (category) {
    case "drum_one_shot":
      // Higher influence for consistent, predictable drum hits
      return 0.6;

    case "drum_loop":
      // Medium-high for consistent groove patterns
      return 0.5;

    case "synth_timbre":
      // Medium for balanced timbre characteristics
      return 0.4;

    case "lead_line":
      // Medium for melodic consistency
      return 0.4;

    case "texture":
      // Lower for more creative, evolving ambient textures
      return 0.25;

    default:
      return 0.3;
  }
}
