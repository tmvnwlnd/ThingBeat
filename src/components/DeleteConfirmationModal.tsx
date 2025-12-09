'use client';

import { useStore } from '@/store/useStore';

export function DeleteConfirmationModal() {
  const showDeleteConfirm = useStore((state) => state.showDeleteConfirm);
  const setShowDeleteConfirm = useStore((state) => state.setShowDeleteConfirm);
  const clearRecordingData = useStore((state) => state.clearRecordingData);

  const handleConfirmDelete = () => {
    clearRecordingData();
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (!showDeleteConfirm) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Darker backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-80"
        onClick={handleCancelDelete}
      />

      {/* Confirmation dialog */}
      <div className="relative bg-thingbeat-blue border-4 border-thingbeat-white p-6 max-w-md font-['Silkscreen']">
        <h3 className="text-xl text-thingbeat-white mb-4">Delete Recording?</h3>
        <p className="text-thingbeat-white mb-6">
          Are you sure you want to delete this recording? This action cannot be undone.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleCancelDelete}
            className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-white text-thingbeat-blue hover:bg-thingbeat-blue hover:text-thingbeat-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
