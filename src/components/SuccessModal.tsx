'use client';

import { useStore } from '@/store/useStore';

export function SuccessModal() {
  const showSuccessModal = useStore((state) => state.showSuccessModal);
  const successMessage = useStore((state) => state.successMessage);
  const setShowSuccessModal = useStore((state) => state.setShowSuccessModal);

  const handleClose = () => {
    setShowSuccessModal(false);
  };

  if (!showSuccessModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-thingbeat-blue border-4 border-thingbeat-white p-8 w-full max-w-md font-['Silkscreen']">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-thingbeat-white">Success!</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue flex items-center justify-center"
            title="Close"
          >
            <img src="/icons/x.svg" alt="Close" className="w-6 h-6" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6 text-thingbeat-white whitespace-pre-line">
          {successMessage}
        </div>

        {/* Close Button */}
        <div className="flex justify-center">
          <button
            onClick={handleClose}
            className="px-8 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-white text-thingbeat-blue hover:bg-thingbeat-blue hover:text-thingbeat-white"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
