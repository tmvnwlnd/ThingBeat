'use client';

import { CellDithered } from '@/components/CellDithered';
import { Header } from '@/components/Header';
import { useWebcam } from '@/hooks/useWebcam';

export default function ShaderTestPage() {
  const { videoRef, error, isLoading } = useWebcam();

  return (
    <main className="min-h-screen bg-thingbeat-blue text-thingbeat-white font-['Silkscreen']">
      <Header />

      <div className="p-2">
        <div className="mb-4 text-center">
          <h1 className="text-xl mb-2">SHADER DITHERING TEST</h1>
          <p className="text-sm">Testing Bayer matrix dithering with WebGL shader</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center min-h-[600px] border-2 border-thingbeat-white">
            <p className="text-lg">Initializing webcam...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center min-h-[600px] border-2 border-red-500">
            <div className="text-center">
              <p className="text-lg text-red-500 mb-2">Camera Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Hidden video element - source for all canvases */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
            />

            {/* 3x3 Grid */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {Array.from({ length: 9 }, (_, i) => (
                <CellDithered key={i} cellId={i} />
              ))}
            </div>

            <div className="mt-4 text-center text-sm">
              <p>Using 8x8 Bayer matrix dithering (WebGL shader)</p>
              <p className="mt-2">Compare with original: <a href="/" className="underline hover:text-white">Go to main page</a></p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
