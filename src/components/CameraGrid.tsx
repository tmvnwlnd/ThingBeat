'use client';

import { Cell } from './Cell';
import { useWebcam } from '@/hooks/useWebcam';

export function CameraGrid() {
  const { videoRef, error, isLoading } = useWebcam();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] border-2 border-thingbeat-blue">
        <p className="text-lg">Initializing webcam...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px] border-2 border-red-500">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-2">Camera Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hidden video element - source for all canvases */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* 3x3 Grid - Full Width */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {Array.from({ length: 9 }, (_, i) => (
          <Cell key={i} cellId={i} />
        ))}
      </div>
    </>
  );
}
