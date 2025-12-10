'use client';

import { useStore } from '@/store/useStore';
import { useState } from 'react';

export function SubmissionModal() {
  const showSubmissionModal = useStore((state) => state.showSubmissionModal);
  const setShowSubmissionModal = useStore((state) => state.setShowSubmissionModal);
  const setRecordingState = useStore((state) => state.setRecordingState);
  const recordingData = useStore((state) => state.recordingData);
  const settings = useStore((state) => state.settings);

  const [beatName, setBeatName] = useState('');
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    setShowSubmissionModal(false);
    setRecordingState('ready'); // Go back to RecordingActionsModal
  };

  const handleSubmit = async () => {
    // Validation
    if (!beatName.trim() || beatName.length > 50) {
      setError('Beat name is required (max 50 characters)');
      return;
    }
    if (!userName.trim() || userName.length > 30) {
      setError('Your name is required (max 30 characters)');
      return;
    }

    if (!recordingData.recordingBlob) {
      setError('No recording found. Please try recording again.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('beatName', beatName.trim());
      formData.append('userName', userName.trim());
      formData.append('audioBlob', recordingData.recordingBlob);
      formData.append('bpm', settings.bpm.toString());
      formData.append('key', settings.key);
      formData.append('loopLength', settings.loopLength.toString());

      // Convert snapshot base64 strings to Blobs
      for (let i = 0; i < 9; i++) {
        const snapshot = recordingData.snapshots[i];
        if (snapshot) {
          // Convert base64 to blob
          const base64Response = await fetch(snapshot);
          const blob = await base64Response.blob();
          formData.append(`snapshot_${i}`, blob);
        } else {
          // Empty cell - append null placeholder
          formData.append(`snapshot_${i}`, new Blob());
        }
      }

      // Upload to backend
      const response = await fetch('/api/community/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('Beat uploaded successfully:', result.beatId);
      if (result.cleanedUp > 0) {
        console.log(`Cleaned up ${result.cleanedUp} old beats to make space`);
      }

      // Show success modal
      const message = `Beat shared successfully! Your beat is now in the community gallery.${result.cleanedUp > 0 ? `\n\nNote: ${result.cleanedUp} old beat${result.cleanedUp > 1 ? 's were' : ' was'} automatically removed to make space.` : ''}`;
      useStore.getState().setShowSuccessModal(true, message);

      // Close modal but DON'T clear recording (only delete when user clicks delete button)
      setShowSubmissionModal(false);
      // Recording remains available for re-sharing or download
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to share beat. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!showSubmissionModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-thingbeat-blue border-4 border-thingbeat-white p-6 w-full max-w-2xl font-['Silkscreen']">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-thingbeat-white">Share to Community Gallery</h2>
          <button
            onClick={handleCancel}
            className="w-8 h-8 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue flex items-center justify-center"
            title="Cancel"
          >
            <img src="/icons/x.svg" alt="Close" className="w-6 h-6" />
          </button>
        </div>

        {/* 3x3 Snapshot Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {recordingData.snapshots.map((snapshot, index) => (
            <div
              key={index}
              className="aspect-video border-2 border-thingbeat-white bg-thingbeat-blue"
            >
              {snapshot ? (
                <img
                  src={snapshot}
                  alt={`Cell ${index}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-thingbeat-white opacity-30">
                  Empty
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          {/* Beat Name Input */}
          <div>
            <label htmlFor="beatName" className="block text-thingbeat-white text-sm mb-2">
              Beat Name (max 50 characters)
            </label>
            <input
              id="beatName"
              type="text"
              value={beatName}
              onChange={(e) => setBeatName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2 bg-thingbeat-blue border-2 border-thingbeat-white text-thingbeat-white font-['Silkscreen'] focus:outline-none focus:border-4"
              placeholder="Enter beat name..."
              disabled={isSubmitting}
            />
          </div>

          {/* User Name Input */}
          <div>
            <label htmlFor="userName" className="block text-thingbeat-white text-sm mb-2">
              Your Name (max 30 characters)
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-2 bg-thingbeat-blue border-2 border-thingbeat-white text-thingbeat-white font-['Silkscreen'] focus:outline-none focus:border-4"
              placeholder="Enter your name..."
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-white text-thingbeat-blue hover:bg-thingbeat-blue hover:text-thingbeat-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sharing...' : 'Share Beat'}
          </button>
        </div>
      </div>
    </div>
  );
}
