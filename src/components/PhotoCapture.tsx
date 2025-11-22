import React, { useState, useRef } from 'react';
import { Camera, RotateCcw, ArrowRight } from 'lucide-react';

interface PhotoCaptureProps {
  onProceed: (frontPhoto: File, backPhoto: File) => void;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onProceed }) => {
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<File | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFrontPhoto(file);
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBackPhoto(file);
  };

  const retakeFront = () => {
    setFrontPhoto(null);
    if (frontInputRef.current) frontInputRef.current.value = '';
  };

  const retakeBack = () => {
    setBackPhoto(null);
    if (backInputRef.current) backInputRef.current.value = '';
  };

  const canProceed = frontPhoto && backPhoto;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Capture Scorecard Photos</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Front Photo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Front Side</h3>
          {frontPhoto ? (
            <div className="space-y-4">
              <img
                src={URL.createObjectURL(frontPhoto)}
                alt="Front scorecard"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                onClick={retakeFront}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                Retake
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <Camera size={48} className="text-gray-400" />
              </div>
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFrontChange}
                className="hidden"
                id="front-photo"
              />
              <label
                htmlFor="front-photo"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera size={20} />
                Capture Front
              </label>
            </div>
          )}
        </div>

        {/* Back Photo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Back Side</h3>
          {backPhoto ? (
            <div className="space-y-4">
              <img
                src={URL.createObjectURL(backPhoto)}
                alt="Back scorecard"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                onClick={retakeBack}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                Retake
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <Camera size={48} className="text-gray-400" />
              </div>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleBackChange}
                className="hidden"
                id="back-photo"
              />
              <label
                htmlFor="back-photo"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera size={20} />
                Capture Back
              </label>
            </div>
          )}
        </div>
      </div>

      {canProceed && (
        <button
          onClick={() => onProceed(frontPhoto!, backPhoto!)}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <ArrowRight size={20} />
          Proceed to Next Step
        </button>
      )}
    </div>
  );
};

export default PhotoCapture;