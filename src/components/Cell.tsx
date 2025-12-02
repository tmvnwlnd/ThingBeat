'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { SoundCategory, CATEGORY_KEYS } from '@/lib/prompt';
import { Dropdown } from './Dropdown';
import { SoundControls } from './SoundControls';

type CellProps = {
  cellId: number;
};

const CATEGORY_LABELS: Record<SoundCategory, string> = {
  drum_loop: 'Drum loop',
  drum_one_shot: 'Drum sample',
  synth_timbre: 'Synth',
  texture: 'Texture',
  lead_line: 'Melody',
};

export function Cell({ cellId }: CellProps) {
  const cell = useStore((state) => state.cells[cellId]);
  const updateCell = useStore((state) => state.updateCell);
  const videoStream = useStore((state) => state.videoStream);
  const isGenerating = useStore((state) => state.isGenerating);
  const hasSynth = useStore((state) => state.hasSynth);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Set random default category on mount
  useEffect(() => {
    if (cell.category === null) {
      const randomCategory = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
      updateCell(cellId, { category: randomCategory });
    }
  }, [cellId, cell.category, updateCell]);

  // Draw video to canvas with posterization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoStream) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = document.createElement('video');
    video.srcObject = videoStream;
    video.play();

    // Store video ref so we can capture from raw video (not posterized canvas)
    videoRef.current = video;

    const drawFrame = () => {
      if (cell.state === 'idle') {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply posterization effect
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

          // Threshold to blue or white
          if (gray > 128) {
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
          } else {
            data[i] = 38;      // R (0x26)
            data[i + 1] = 0;   // G
            data[i + 2] = 255; // B (0xFF)
          }
        }

        ctx.putImageData(imageData, 0, 0);
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
    };
  }, [videoStream, cell.state]);

  const handleCellClick = async () => {
    if (cell.state !== 'idle' || isGenerating || !cell.category) return;

    // Capture snapshot from RAW VIDEO (not posterized canvas)
    // This ensures Claude gets the full-color image, while UI shows posterized version
    const video = videoRef.current;
    if (!video) return;

    // Create a smaller canvas for API to reduce costs
    // Claude charges based on image size, so we'll resize to 400x225 (keeps 16:9 ratio)
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 400;
    smallCanvas.height = 225;
    const smallCtx = smallCanvas.getContext('2d');

    if (!smallCtx) return;

    // Draw the raw video to the smaller canvas (automatic downscaling)
    // This captures FULL COLOR, not the posterized blue/white effect
    smallCtx.drawImage(video, 0, 0, smallCanvas.width, smallCanvas.height);

    // Convert to JPEG with 70% quality (much smaller than PNG)
    const snapshot = smallCanvas.toDataURL('image/jpeg', 0.7);

    // Update cell to loading state and mark as generating
    updateCell(cellId, { snapshot, state: 'loading' });
    useStore.getState().setIsGenerating(true);

    try {
      console.log('\n🎬 === STARTING SOUND GENERATION ===');
      console.log('Cell:', cellId);
      console.log('Category:', cell.category);

      // Step 1: Describe the image using Claude
      console.log('\n📸 Step 1: Sending image to Claude...');
      const describeResponse = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: snapshot,
          category: cell.category,
        }),
      });

      if (!describeResponse.ok) {
        const errorData = await describeResponse.json();
        console.error('❌ /api/describe failed:', errorData);
        throw new Error('Failed to describe image');
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

      {/* Error State - TODO */}
      {cell.state === 'error' && (
        <div className="w-full h-full bg-red-500 flex items-center justify-center text-white">
          Error
        </div>
      )}
    </div>
  );
}
