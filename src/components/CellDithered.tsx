'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { SoundCategory, CATEGORY_KEYS } from '@/lib/prompt';
import { Dropdown } from './Dropdown';
import { SoundControls } from './SoundControls';
import { initializeAudio } from '@/lib/audioInit';

type CellDitheredProps = {
  cellId: number;
};

const CATEGORY_LABELS: Record<SoundCategory, string> = {
  drum_loop: 'Drum loop',
  drum_one_shot: 'Drum sample',
  synth_timbre: 'Synth',
  texture: 'Texture',
  lead_line: 'Melody',
};

// Fragment shader source (Bayer matrix dithering)
// Simplified for WebGL 1.0 compatibility - avoiding integer operations
const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;

varying vec2 vUv;

// 8x8 Bayer matrix lookup using floor() to avoid integer casting
float getBayer8x8(vec2 pos) {
  float x = floor(mod(pos.x, 8.0));
  float y = floor(mod(pos.y, 8.0));
  float idx = y * 8.0 + x;

  // Row 0
  if (idx < 0.5) return 0.0 / 64.0;
  if (idx < 1.5) return 48.0 / 64.0;
  if (idx < 2.5) return 12.0 / 64.0;
  if (idx < 3.5) return 60.0 / 64.0;
  if (idx < 4.5) return 3.0 / 64.0;
  if (idx < 5.5) return 51.0 / 64.0;
  if (idx < 6.5) return 15.0 / 64.0;
  if (idx < 7.5) return 63.0 / 64.0;

  // Row 1
  if (idx < 8.5) return 32.0 / 64.0;
  if (idx < 9.5) return 16.0 / 64.0;
  if (idx < 10.5) return 44.0 / 64.0;
  if (idx < 11.5) return 28.0 / 64.0;
  if (idx < 12.5) return 35.0 / 64.0;
  if (idx < 13.5) return 19.0 / 64.0;
  if (idx < 14.5) return 47.0 / 64.0;
  if (idx < 15.5) return 31.0 / 64.0;

  // Row 2
  if (idx < 16.5) return 8.0 / 64.0;
  if (idx < 17.5) return 56.0 / 64.0;
  if (idx < 18.5) return 4.0 / 64.0;
  if (idx < 19.5) return 52.0 / 64.0;
  if (idx < 20.5) return 11.0 / 64.0;
  if (idx < 21.5) return 59.0 / 64.0;
  if (idx < 22.5) return 7.0 / 64.0;
  if (idx < 23.5) return 55.0 / 64.0;

  // Row 3
  if (idx < 24.5) return 40.0 / 64.0;
  if (idx < 25.5) return 24.0 / 64.0;
  if (idx < 26.5) return 36.0 / 64.0;
  if (idx < 27.5) return 20.0 / 64.0;
  if (idx < 28.5) return 43.0 / 64.0;
  if (idx < 29.5) return 27.0 / 64.0;
  if (idx < 30.5) return 39.0 / 64.0;
  if (idx < 31.5) return 23.0 / 64.0;

  // Row 4
  if (idx < 32.5) return 2.0 / 64.0;
  if (idx < 33.5) return 50.0 / 64.0;
  if (idx < 34.5) return 14.0 / 64.0;
  if (idx < 35.5) return 62.0 / 64.0;
  if (idx < 36.5) return 1.0 / 64.0;
  if (idx < 37.5) return 49.0 / 64.0;
  if (idx < 38.5) return 13.0 / 64.0;
  if (idx < 39.5) return 61.0 / 64.0;

  // Row 5
  if (idx < 40.5) return 34.0 / 64.0;
  if (idx < 41.5) return 18.0 / 64.0;
  if (idx < 42.5) return 46.0 / 64.0;
  if (idx < 43.5) return 30.0 / 64.0;
  if (idx < 44.5) return 33.0 / 64.0;
  if (idx < 45.5) return 17.0 / 64.0;
  if (idx < 46.5) return 45.0 / 64.0;
  if (idx < 47.5) return 29.0 / 64.0;

  // Row 6
  if (idx < 48.5) return 10.0 / 64.0;
  if (idx < 49.5) return 58.0 / 64.0;
  if (idx < 50.5) return 6.0 / 64.0;
  if (idx < 51.5) return 54.0 / 64.0;
  if (idx < 52.5) return 9.0 / 64.0;
  if (idx < 53.5) return 57.0 / 64.0;
  if (idx < 54.5) return 5.0 / 64.0;
  if (idx < 55.5) return 53.0 / 64.0;

  // Row 7
  if (idx < 56.5) return 42.0 / 64.0;
  if (idx < 57.5) return 26.0 / 64.0;
  if (idx < 58.5) return 38.0 / 64.0;
  if (idx < 59.5) return 22.0 / 64.0;
  if (idx < 60.5) return 41.0 / 64.0;
  if (idx < 61.5) return 25.0 / 64.0;
  if (idx < 62.5) return 37.0 / 64.0;
  if (idx < 63.5) return 21.0 / 64.0;

  return 0.0;
}

void main() {
  // Pixelation/block size - larger = rougher/blockier
  float blockSize = 4.0;

  // Downsample the UV coordinates to create pixelation
  // This makes each block sample from the same position, removing fine detail
  vec2 blockUv = floor((vUv * uResolution) / blockSize) * blockSize / uResolution;

  // Sample the texture at the downsampled (pixelated) position
  vec4 color = texture2D(uTexture, blockUv);

  // Convert to grayscale using standard luminance weights
  float lum = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);

  // Increase contrast: boost the luminance difference
  float contrast = 1.5; // Increase this for more contrast (1.0 = no change, 2.0 = double)
  lum = (lum - 0.5) * contrast + 0.5;
  lum = clamp(lum, 0.0, 1.0); // Keep in valid range

  // Get pixel position for Bayer matrix lookup
  vec2 pixelPos = (vUv * uResolution) / blockSize;

  // Get threshold from 8x8 Bayer matrix
  float threshold = getBayer8x8(pixelPos);

  // Adjust threshold range to make dithering more aggressive
  threshold = threshold * 0.8 + 0.1; // Maps 0-1 range to 0.1-0.9

  // Apply dithering
  vec3 finalColor;
  if (lum > threshold) {
    // White
    finalColor = vec3(1.0, 1.0, 1.0);
  } else {
    // ThingBeat blue (RGB: 38, 0, 255)
    finalColor = vec3(38.0/255.0, 0.0, 1.0);
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Vertex shader source
const VERTEX_SHADER = `
attribute vec2 aPosition;
attribute vec2 aTexCoord;

varying vec2 vUv;

void main() {
  vUv = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export function CellDithered({ cellId }: CellDitheredProps) {
  const cell = useStore((state) => state.cells[cellId]);
  const updateCell = useStore((state) => state.updateCell);
  const videoStream = useStore((state) => state.videoStream);
  const isGenerating = useStore((state) => state.isGenerating);
  const hasSynth = useStore((state) => state.hasSynth);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // WebGL refs
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);

  // Set random default category on mount
  useEffect(() => {
    if (cell.category === null) {
      const randomCategory = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
      updateCell(cellId, { category: randomCategory });
    }
  }, [cellId, cell.category, updateCell]);

  // Pre-initialize AudioContext on first user interaction to eliminate keyboard latency
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Initialize WebGL and render video with Bayer dithering shader
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoStream) return;

    // Initialize WebGL context
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    // Create video element
    const video = document.createElement('video');
    video.srcObject = videoStream;
    video.play();
    videoRef.current = video;

    // Compile shader
    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shaders');
      return;
    }

    // Create program
    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    console.log('✅ WebGL shader compiled successfully');

    gl.useProgram(program);
    programRef.current = program;

    // Set up geometry (full-screen quad)
    const positions = new Float32Array([
      -1, -1,  // bottom-left
       1, -1,  // bottom-right
      -1,  1,  // top-left
       1,  1,  // top-right
    ]);

    const texCoords = new Float32Array([
      0, 1,  // bottom-left
      1, 1,  // bottom-right
      0, 0,  // top-left
      1, 0,  // top-right
    ]);

    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // TexCoord buffer
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
    gl.enableVertexAttribArray(aTexCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // Create texture
    const texture = gl.createTexture();
    textureRef.current = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Get uniform locations
    const uTexture = gl.getUniformLocation(program, 'uTexture');
    const uResolution = gl.getUniformLocation(program, 'uResolution');

    // Set uniforms
    gl.uniform1i(uTexture, 0);
    gl.uniform2f(uResolution, canvas.width, canvas.height);

    // Render loop
    const drawFrame = () => {
      if (cell.state === 'idle' && video.readyState >= video.HAVE_CURRENT_DATA) {
        // Upload video frame to texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

        // Draw
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      animationRef.current = requestAnimationFrame(drawFrame);
    };

    video.addEventListener('loadedmetadata', () => {
      drawFrame();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      video.pause();
      video.srcObject = null;

      // Clean up WebGL resources
      if (gl && texture) {
        gl.deleteTexture(texture);
      }
      if (gl && program) {
        gl.deleteProgram(program);
      }
    };
  }, [videoStream, cell.state]);

  const handleCellClick = async () => {
    if (cell.state !== 'idle' || isGenerating || !cell.category) return;

    // Capture snapshot from RAW VIDEO (not dithered canvas)
    const video = videoRef.current;
    if (!video) return;

    // Create a smaller canvas for API
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 400;
    smallCanvas.height = 225;
    const smallCtx = smallCanvas.getContext('2d');

    if (!smallCtx) return;

    // Draw raw video (full color for Claude API)
    smallCtx.drawImage(video, 0, 0, smallCanvas.width, smallCanvas.height);
    const snapshotForAPI = smallCanvas.toDataURL('image/jpeg', 0.7);

    // Create DITHERED version for UI display using WebGL
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;

    if (!gl || !program || !texture) {
      console.error('WebGL not initialized');
      return;
    }

    // Create offscreen canvas for dithered snapshot
    const ditheredCanvas = document.createElement('canvas');
    ditheredCanvas.width = 400;
    ditheredCanvas.height = 225;
    const ditheredGl = ditheredCanvas.getContext('webgl');

    if (!ditheredGl) {
      console.error('Failed to create WebGL context for snapshot');
      return;
    }

    // Apply the same shader to create dithered snapshot
    // (This is a simplified approach - in production, you'd reuse the shader setup)
    // For now, we'll use the main canvas and capture it
    const posterizedSnapshot = canvasRef.current?.toDataURL('image/jpeg', 0.7) || snapshotForAPI;

    // Update cell to loading state with DITHERED snapshot for UI display
    updateCell(cellId, { snapshot: posterizedSnapshot, state: 'loading' });
    useStore.getState().setIsGenerating(true);

    try {
      console.log('\n🎬 === STARTING SOUND GENERATION ===');
      console.log('Cell:', cellId);
      console.log('Category:', cell.category);

      // Step 1: Describe the image using Claude (send RAW snapshot, not dithered)
      console.log('\n📸 Step 1: Sending image to Claude...');
      const describeResponse = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: snapshotForAPI,
          category: cell.category,
        }),
      });

      if (!describeResponse.ok) {
        let errorData;
        try {
          errorData = await describeResponse.json();
        } catch (e) {
          const errorText = await describeResponse.text();
          console.error('❌ /api/describe failed (non-JSON response):', errorText);
          throw new Error(`Failed to describe image: ${errorText.substring(0, 100)}`);
        }
        console.error('❌ /api/describe failed:', errorData);
        throw new Error(errorData.error || 'Failed to describe image');
      }

      const { descriptor } = await describeResponse.json();
      console.log('✅ Step 1 complete! Descriptor:', descriptor);

      // Update cell with LLM descriptor
      updateCell(cellId, { llmDescriptor: descriptor });

      // Step 2: Generate audio using ElevenLabs
      const settings = useStore.getState().settings;
      console.log('\n🔊 Step 2: Generating audio with ElevenLabs...');
      console.log('Settings:', { bpm: settings.bpm, key: settings.key, loopLength: settings.loopLength });

      const audioResponse = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descriptor,
          category: cell.category,
          settings: {
            bpm: settings.bpm,
            key: settings.key,
            loopLength: settings.loopLength,
          },
        }),
      });

      if (!audioResponse.ok) {
        const errorData = await audioResponse.json();
        console.error('❌ /api/generate-audio failed:', errorData);
        throw new Error('Failed to generate audio');
      }

      const { audioUrl } = await audioResponse.json();
      console.log('✅ Step 2 complete! Audio generated');

      // Update cell to ready state with audio
      updateCell(cellId, {
        audioUrl,
        state: 'ready',
        originalBPM: settings.bpm,
        originalKey: settings.key,
      });

      // If this is a synth, mark that we have one
      if (cell.category === 'synth_timbre') {
        useStore.getState().setHasSynth(true);
      }

      console.log('🎉 === SOUND GENERATION COMPLETE ===\n');

    } catch (error) {
      console.error('\n❌ === SOUND GENERATION FAILED ===');
      console.error('Error:', error);
      console.error('===================================\n');
      updateCell(cellId, {
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      useStore.getState().setIsGenerating(false);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    updateCell(cellId, { category: newCategory as SoundCategory });
  };

  const isSynthDisabled = hasSynth && cell.category !== 'synth_timbre';

  return (
    <div className="relative aspect-video border-2 border-thingbeat-white overflow-hidden bg-thingbeat-blue">
      {/* Idle State */}
      {cell.state === 'idle' && (
        <>
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-cover"
          />

          {/* Bottom bar with dropdown and record button */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-1.5 p-2">
            {/* Custom Dropdown */}
            <div className="flex-1 max-w-[250px]" onClick={(e) => e.stopPropagation()}>
              <Dropdown
                value={cell.category || ''}
                onChange={handleCategoryChange}
                options={CATEGORY_KEYS.map((cat) => ({
                  value: cat,
                  label: CATEGORY_LABELS[cat],
                  disabled: cat === 'synth_timbre' && isSynthDisabled,
                }))}
                disabled={isGenerating}
              />
            </div>

            {/* Record Button */}
            <button
              className="w-12 h-12 bg-thingbeat-blue border-2 border-thingbeat-white flex items-center justify-center hover:border-4 disabled:opacity-50"
              onClick={handleCellClick}
              disabled={isGenerating}
            >
              <div className="w-4 h-4 bg-thingbeat-white" />
            </button>
          </div>
        </>
      )}

      {/* Loading State */}
      {cell.state === 'loading' && (
        <>
          {/* Background - either snapshot or blue */}
          {cell.snapshot ? (
            <img src={cell.snapshot} alt="Snapshot" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-thingbeat-blue" />
          )}

          {/* Centered Pulsating Star */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/icons/starsprite.gif"
              alt="Loading"
              className="w-16 h-16"
            />
          </div>

          {/* Bottom bar with loading text and cancel button */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-1.5 p-2">
            <span className="text-lg text-thingbeat-white uppercase flex-1">
              Generating {CATEGORY_LABELS[cell.category || 'drum_one_shot']}....
            </span>
            <button
              className="h-12 px-4 bg-thingbeat-blue text-thingbeat-white border-2 border-thingbeat-white text-lg hover:bg-thingbeat-white hover:text-thingbeat-blue transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                useStore.getState().resetCell(cellId);
                useStore.getState().setIsGenerating(false);
              }}
            >
              cancel
            </button>
          </div>
        </>
      )}

      {/* Ready State */}
      {cell.state === 'ready' && cell.audioUrl && cell.snapshot && cell.category && (
        <SoundControls
          cellId={cellId}
          category={cell.category}
          audioUrl={cell.audioUrl}
          snapshot={cell.snapshot}
          volume={cell.volume}
          onDelete={() => {
            // If this was a synth, mark that we no longer have one
            if (cell.category === 'synth_timbre') {
              useStore.getState().setHasSynth(false);
            }
            useStore.getState().resetCell(cellId);
          }}
        />
      )}

      {/* Error State */}
      {cell.state === 'error' && (
        <div className="w-full h-full bg-red-500 flex items-center justify-center text-white">
          Error
        </div>
      )}
    </div>
  );
}
