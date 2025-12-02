'use client';

import { useEffect, useRef, useState } from 'react';
import { SoundCategory, CATEGORY_KEYS, CATEGORY_PROMPTS } from '@/lib/prompt';

type PromptTest = {
  snapshot: string;
  category: SoundCategory;
  promptSent: {
    systemPrompt: string;
    userPrompt: string;
    settings: {
      bpm: number;
      key: string;
      loopLength: number;
    };
    imageFormat: string;
    imageSize: string;
  };
  response: string;
  timestamp: number;
};

const CATEGORY_LABELS: Record<SoundCategory, string> = {
  drum_loop: 'Drum Loop',
  drum_one_shot: 'Drum Sample',
  synth_timbre: 'Synth',
  texture: 'Texture',
  lead_line: 'Melody',
};

export default function PromptLab() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [category, setCategory] = useState<SoundCategory>('drum_one_shot');
  const [isLoading, setIsLoading] = useState(false);
  const [tests, setTests] = useState<PromptTest[]>([]);
  const [bpm, setBpm] = useState(120);
  const [key, setKey] = useState('C');
  const [loopLength, setLoopLength] = useState(4);

  // Initialize webcam
  useEffect(() => {
    let mounted = true;

    const initWebcam = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360 },
        });

        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }
      } catch (error) {
        console.error('Failed to access webcam:', error);
      }
    };

    initWebcam();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Draw video to canvas with posterization
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !stream) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrame = () => {
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
      animationRef.current = requestAnimationFrame(drawFrame);
    };

    video.addEventListener('loadedmetadata', () => {
      drawFrame();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stream]);

  const handleSnapshot = async () => {
    // Capture from RAW VIDEO (not posterized canvas) for accurate testing
    const video = videoRef.current;
    if (!video || isLoading) return;

    setIsLoading(true);

    // Create a smaller canvas for API
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 400;
    smallCanvas.height = 225;
    const smallCtx = smallCanvas.getContext('2d');

    if (!smallCtx) {
      setIsLoading(false);
      return;
    }

    // Draw the raw video to the smaller canvas (FULL COLOR, not posterized)
    smallCtx.drawImage(video, 0, 0, smallCanvas.width, smallCanvas.height);

    // Convert to JPEG with 70% quality
    const snapshot = smallCanvas.toDataURL('image/jpeg', 0.7);

    try {
      // Call the describe API
      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: snapshot,
          category: category,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to describe image');
      }

      const { descriptor } = await response.json();

      // Get the prompts used
      const prompts = CATEGORY_PROMPTS[category];

      // Create test result
      const test: PromptTest = {
        snapshot,
        category,
        promptSent: {
          systemPrompt: prompts.system,
          userPrompt: prompts.user,
          settings: {
            bpm,
            key,
            loopLength,
          },
          imageFormat: 'image/jpeg',
          imageSize: `${smallCanvas.width}x${smallCanvas.height} @ 70% quality`,
        },
        response: descriptor,
        timestamp: Date.now(),
      };

      // Add to tests array (prepend so newest is first)
      setTests((prev) => [test, ...prev]);
    } catch (error) {
      console.error('Error testing prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTests = () => {
    setTests([]);
  };

  return (
    <div className="min-h-screen bg-thingbeat-blue p-4">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white p-4 mb-4">
          <h1 className="text-3xl font-bold text-thingbeat-blue font-silkscreen">
            Prompt Lab
          </h1>
          <p className="text-sm text-thingbeat-blue mt-2">
            Test and optimize LLM prompts for ThingBeat sound generation
          </p>
        </div>

        {/* Settings */}
        <div className="bg-thingbeat-blue border-2 border-white p-4 mb-4">
          <div className="flex gap-6 items-center text-white">
            <div className="flex items-center gap-2">
              <span className="text-sm font-silkscreen">BPM:</span>
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                className="w-16 px-2 py-1 bg-thingbeat-blue border-2 border-white text-white font-silkscreen text-center"
                min={60}
                max={300}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-silkscreen">Key:</span>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-16 px-2 py-1 bg-thingbeat-blue border-2 border-white text-white font-silkscreen text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-silkscreen">Loop Length:</span>
              <input
                type="number"
                value={loopLength}
                onChange={(e) => setLoopLength(parseInt(e.target.value) || 4)}
                className="w-16 px-2 py-1 bg-thingbeat-blue border-2 border-white text-white font-silkscreen text-center"
                min={1}
                max={16}
              />
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-thingbeat-blue border-2 border-white p-4">
          <div className="flex gap-4 items-center">
            {/* Category Dropdown */}
            <div className="flex-1">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SoundCategory)}
                className="w-full px-4 py-3 bg-thingbeat-blue border-2 border-white text-white font-silkscreen text-lg"
                disabled={isLoading}
              >
                {CATEGORY_KEYS.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Snapshot Button */}
            <button
              onClick={handleSnapshot}
              disabled={isLoading}
              className="px-6 py-3 bg-thingbeat-blue border-2 border-white text-white font-silkscreen text-lg hover:bg-white hover:text-thingbeat-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : 'Test Prompt'}
            </button>

            {/* Clear Button */}
            {tests.length > 0 && (
              <button
                onClick={clearTests}
                className="px-6 py-3 bg-thingbeat-blue border-2 border-white text-white font-silkscreen text-lg hover:bg-white hover:text-thingbeat-blue"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Live Preview */}
          <div className="mt-4">
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="w-full border-2 border-white"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto space-y-4">
        {tests.map((test) => (
          <div
            key={test.timestamp}
            className="bg-white border-4 border-thingbeat-blue p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-thingbeat-blue font-silkscreen">
                {CATEGORY_LABELS[test.category]}
              </h3>
              <span className="text-sm text-gray-600">
                {new Date(test.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Column 1: Snapshot */}
              <div>
                <h4 className="text-sm font-bold text-thingbeat-blue font-silkscreen mb-2 uppercase">
                  Snapshot
                </h4>
                <img
                  src={test.snapshot}
                  alt="Snapshot"
                  className="w-full border-2 border-thingbeat-blue"
                />
                <div className="mt-2 text-xs text-gray-600 font-mono">
                  <div>Format: {test.promptSent.imageFormat}</div>
                  <div>Size: {test.promptSent.imageSize}</div>
                </div>
              </div>

              {/* Column 2: Prompt Sent */}
              <div>
                <h4 className="text-sm font-bold text-thingbeat-blue font-silkscreen mb-2 uppercase">
                  Prompt Sent to Claude
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="font-bold text-thingbeat-blue mb-1">System Prompt:</div>
                    <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                      {test.promptSent.systemPrompt}
                    </pre>
                  </div>
                  <div>
                    <div className="font-bold text-thingbeat-blue mb-1">User Prompt:</div>
                    <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                      {test.promptSent.userPrompt}
                    </pre>
                  </div>
                  <div>
                    <div className="font-bold text-thingbeat-blue mb-1">Settings:</div>
                    <pre className="bg-gray-100 p-2 rounded">
                      {JSON.stringify(test.promptSent.settings, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Column 3: Response */}
              <div>
                <h4 className="text-sm font-bold text-thingbeat-blue font-silkscreen mb-2 uppercase">
                  Claude Response
                </h4>
                <div className="bg-green-50 border-2 border-green-600 p-4 rounded">
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                    {test.response}
                  </pre>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <div>Token count: ~{test.response.split(/[\s,]+/).length} words</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {tests.length === 0 && (
          <div className="bg-white border-2 border-thingbeat-blue p-8 text-center">
            <p className="text-thingbeat-blue font-silkscreen">
              No tests yet. Select a category and click "Test Prompt" to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
