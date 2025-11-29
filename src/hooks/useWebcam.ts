import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';

export function useWebcam() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setVideoStream = useStore((state) => state.setVideoStream);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initWebcam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        setVideoStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Failed to access webcam. Please grant camera permissions.');
        setIsLoading(false);
      }
    }

    initWebcam();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setVideoStream(null);
    };
  }, [setVideoStream]);

  return { videoRef, error, isLoading };
}
