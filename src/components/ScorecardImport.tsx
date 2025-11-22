import React, { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, CheckCircle, Play, RotateCcw } from 'lucide-react';
import PhotoCapture from './PhotoCapture';
import DataReview from './DataReview';
import ScorecardExtractor, { CourseMetadata, ExtractedScoreData, Course, Round } from '../utils/ScorecardExtractor';
import GolfDB from '../utils/GolfDB';

interface ScorecardImportProps {
  db: GolfDB;
  onSave: (course: Course, round?: Round) => void;
  onCancel: () => void;
  onStartNewRound?: (course: Course) => void;
}

type ImportStep = 'capture' | 'processing' | 'review' | 'post-save';

const ScorecardImport: React.FC<ScorecardImportProps> = ({
  db,
  onSave,
  onCancel,
  onStartNewRound
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('capture');
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<File | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<CourseMetadata | null>(null);
  const [extractedScores, setExtractedScores] = useState<ExtractedScoreData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [savedCourse, setSavedCourse] = useState<Course | null>(null);
  const [savedRound, setSavedRound] = useState<Round | null>(null);

  const handlePhotoCapture = useCallback(async (front: File, back: File) => {
    setFrontPhoto(front);
    setBackPhoto(back);
    setCurrentStep('processing');
    setProcessingError(null);
    setIsProcessing(true);

    try {
      const extractor = new ScorecardExtractor();

      // Extract course metadata
      const metadata = await extractor.extractCourseMetadata(front, back);
      setExtractedMetadata(metadata);

      // Check if scores are present and extract them
      const frontBlob = new Blob([front], { type: front.type });
      const detectionResult = await extractor.detectScoresFilled(frontBlob);

      if (detectionResult.hasScores) {
        const scores = await extractor.extractRoundData(frontBlob, metadata);
        setExtractedScores(scores);
      } else {
        setExtractedScores([]);
      }

      // Cleanup
      await extractor.cleanup();

      setCurrentStep('review');
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingError(error instanceof Error ? error.message : 'Failed to process scorecard');
      setCurrentStep('capture');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDataSave = useCallback(async (course: Course, round?: Round) => {
    try {
      // Save course to database
      await db.put('courses', course);
      setSavedCourse(course);

      if (round) {
        // Create round with id for database storage
        const roundId = `round-${Date.now()}`;
        const roundWithId = {
          id: roundId,
          courseId: round.courseId,
          date: round.date,
          teeBox: round.teeBox,
          totalScore: round.holeScores.reduce((sum, h) => sum + h.score, 0),
          scoreToPar: round.holeScores.reduce((sum, h) => sum + h.score, 0) - course.par,
          differential: round.holeScores.reduce((sum, h) => sum + h.score, 0) - course.par,
          completed: true
        };

        // Save round to database
        await db.put('rounds', roundWithId);

        // Save hole scores
        for (const holeScore of round.holeScores) {
          const holeScoreData = {
            id: `hole-${roundId}-${holeScore.holeNumber}`,
            roundId: roundId,
            holeNumber: holeScore.holeNumber,
            score: holeScore.score,
            putts: holeScore.putts || 0,
            fairwayHit: holeScore.fairwayHit || 'n/a',
            greenInRegulation: holeScore.greenInRegulation || false,
            penaltyStrokes: holeScore.penaltyStrokes || 0
          };
          await db.put('holeScores', holeScoreData);
        }

        setSavedRound(roundWithId as any);
      }

      setCurrentStep('post-save');
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save data to database';
      setProcessingError(errorMessage);
      setCurrentStep('review'); // Go back to review step so user can try again
    }
  }, [db]);

  const handleStartNewRound = useCallback(() => {
    if (savedCourse && onStartNewRound) {
      onStartNewRound(savedCourse);
    }
  }, [savedCourse, onStartNewRound]);

  const handleRestart = useCallback(() => {
    setCurrentStep('capture');
    setFrontPhoto(null);
    setBackPhoto(null);
    setExtractedMetadata(null);
    setExtractedScores([]);
    setProcessingError(null);
    setSavedCourse(null);
    setSavedRound(null);
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 'capture':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onCancel}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Go back"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Import Scorecard</h1>
            </div>
            <PhotoCapture onProceed={handlePhotoCapture} />
            {processingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{processingError}</p>
              </div>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <Loader2 size={48} className="animate-spin text-blue-600" />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Scorecard</h2>
              <p className="text-gray-600">Extracting course information and scores...</p>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentStep('capture')}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Go back to photo capture"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Review Extracted Data</h1>
            </div>
            <DataReview
              extractedCourseMetadata={extractedMetadata}
              extractedRoundData={extractedScores}
              onSave={handleDataSave}
              onCancel={() => setCurrentStep('capture')}
            />
          </div>
        );

      case 'post-save':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <CheckCircle size={64} className="text-green-600" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Import Complete!</h2>
              <p className="text-gray-600 mb-6">
                Course "{savedCourse?.name}" has been saved successfully.
                {savedRound && ' Round data has also been saved.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              {savedRound ? (
                <button
                  onClick={handleRestart}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} />
                  Import Another
                </button>
              ) : (
                <>
                  <button
                    onClick={handleStartNewRound}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Play size={20} />
                    Start Round
                  </button>
                  <button
                    onClick={handleRestart}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={20} />
                    Import Another
                  </button>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderStep()}
    </div>
  );
};

export default ScorecardImport;