'use client';

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type VolumeSliderProps = {
  volume: number; // 0-1
  onChange: (volume: number) => void;
  onClose: () => void;
  buttonRect: DOMRect | null;
};

export function VolumeSlider({ volume, onChange, onClose, buttonRect }: VolumeSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simple, clean measurements
  const CONTAINER_WIDTH = 48;
  const CONTAINER_HEIGHT = 240;
  const TRACK_WIDTH = 14;
  const TRACK_HEIGHT = 220; // Leaves 30px padding top+bottom
  const HANDLE_SIZE = 32;
  const TRACK_PADDING_TOP = 10; // Space from container top to track

  // Calculate positions
  const trackTop = TRACK_PADDING_TOP;
  const trackBottom = trackTop + TRACK_HEIGHT;

  // Fill grows from 0 to TRACK_HEIGHT based on volume
  const fillHeight = volume * TRACK_HEIGHT;

  // Handle position: moves from bottom to top
  // Leave small margin so handle doesn't overlap track borders
  const handleMovementRange = TRACK_HEIGHT - HANDLE_SIZE;
  const handleTop = trackTop + (1 - volume) * handleMovementRange;

  // Position slider on screen relative to button
  const sliderLeft = buttonRect ? buttonRect.left : 0;
  const sliderBottom = buttonRect ? window.innerHeight - buttonRect.top : 0;

  const updateVolumeFromY = (clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;

    // Calculate relative to track
    const relativeY = y - trackTop;
    const clampedY = Math.max(0, Math.min(TRACK_HEIGHT, relativeY));

    // Invert (bottom = 0%, top = 100%)
    const newVolume = 1 - (clampedY / TRACK_HEIGHT);
    onChange(Math.max(0, Math.min(1, newVolume)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    updateVolumeFromY(e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateVolumeFromY(e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    const timeout = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDragging, onClose]);

  if (!mounted || !buttonRect) return null;

  const slider = (
    <div
      ref={containerRef}
      className="fixed bg-thingbeat-blue border-2 border-white overflow-hidden z-[100] cursor-pointer"
      style={{
        width: `${CONTAINER_WIDTH}px`,
        height: `${CONTAINER_HEIGHT}px`,
        left: `${sliderLeft}px`,
        bottom: `${sliderBottom}px`
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Vertical track with white border */}
      <div
        className="absolute border-2 border-white left-1/2 -translate-x-1/2"
        style={{
          width: `${TRACK_WIDTH}px`,
          height: `${TRACK_HEIGHT}px`,
          top: `${trackTop}px`
        }}
      >
        {/* White fill (grows from bottom to top) */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white"
          style={{ height: `${fillHeight}px` }}
        />
      </div>

      {/* Draggable handle (blue square with white border) */}
      <div
        className="absolute bg-thingbeat-blue border-2 border-white cursor-grab active:cursor-grabbing hover:border-4 active:border-4"
        style={{
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          left: `${(CONTAINER_WIDTH - HANDLE_SIZE) / 2}px`, // Center horizontally
          top: `${handleTop}px`
        }}
      />
    </div>
  );

  return createPortal(slider, document.body);
}
