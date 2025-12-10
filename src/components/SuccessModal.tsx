'use client';

import { useStore } from '@/store/useStore';

export function SuccessModal() {
  const showSuccessModal = useStore((state) => state.showSuccessModal);
  const successMessage = useStore((state) => state.successMessage);
  const successBeatId = useStore((state) => state.successBeatId);
  const setShowSuccessModal = useStore((state) => state.setShowSuccessModal);

  const handleClose = () => {
    setShowSuccessModal(false);
  };

  const handleMailLink = () => {
    if (!successBeatId) return;

    const beatUrl = `${window.location.origin}/community/${successBeatId}`;
    const subject = encodeURIComponent('My ThingBeat Recording');
    const body = encodeURIComponent(`Check out my beat at:\n\n${beatUrl}`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
            className="w-8 h-8 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:border-4 flex items-center justify-center"
            title="Close"
          >
            <img src="/icons/x.svg" alt="Close" className="w-6 h-6" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6 text-thingbeat-white whitespace-pre-line">
          {successMessage}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {successBeatId && (
            <button
              onClick={handleMailLink}
              className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
            >
              Mail me the link
            </button>
          )}
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
