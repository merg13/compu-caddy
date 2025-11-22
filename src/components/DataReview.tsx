import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, Save } from 'lucide-react';

// Import types from ScorecardExtractor
interface CourseMetadata {
  courseName: string;
  location?: string;
  parRatings: number[];
  holeDetails: {
    holeNumber: number;
    par: number;
    distance?: number;
    handicap?: number;
  }[];
  totalPar: number;
  confidence: number;
}

interface ExtractedScoreData {
  holeNumber: number;
  score: number | null;
  putts?: number | null;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface Course {
  id: string;
  name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  holes: {
    number: number;
    par: number;
    handicap: number;
    yardages: { [key: string]: number };
  }[];
  par: number;
  confidence: number;
}

interface Round {
  courseId: string;
  date: string;
  teeBox: string;
  holeScores: {
    holeNumber: number;
    score: number;
    putts?: number;
    fairwayHit?: string;
    greenInRegulation?: boolean;
    penaltyStrokes?: number;
  }[];
  confidence: number;
}

interface DataReviewProps {
  extractedCourseMetadata: CourseMetadata | null;
  extractedRoundData: ExtractedScoreData[] | null;
  onSave: (course: Course, round?: Round) => void;
  onCancel: () => void;
}

const DataReview: React.FC<DataReviewProps> = ({
  extractedCourseMetadata,
  extractedRoundData,
  onSave,
  onCancel
}) => {
  // Editable course metadata state
  const [editedCourse, setEditedCourse] = useState<CourseMetadata | null>(null);

  // Editable round data state
  const [editedRound, setEditedRound] = useState<ExtractedScoreData[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Initialize state from props
  useEffect(() => {
    if (extractedCourseMetadata) {
      setEditedCourse({ ...extractedCourseMetadata });
    }
    if (extractedRoundData) {
      setEditedRound([...extractedRoundData]);
    }
  }, [extractedCourseMetadata, extractedRoundData]);

  // Update course field
  const updateCourseField = (field: keyof CourseMetadata, value: any) => {
    if (!editedCourse) return;
    setEditedCourse({ ...editedCourse, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Update hole detail
  const updateHoleDetail = (holeIndex: number, field: keyof CourseMetadata['holeDetails'][0], value: any) => {
    if (!editedCourse) return;
    const updatedHoles = [...editedCourse.holeDetails];
    updatedHoles[holeIndex] = { ...updatedHoles[holeIndex], [field]: value };
    setEditedCourse({ ...editedCourse, holeDetails: updatedHoles });
  };

  // Update round score
  const updateRoundScore = (holeIndex: number, field: keyof ExtractedScoreData, value: any) => {
    const updatedScores = [...editedRound];
    updatedScores[holeIndex] = { ...updatedScores[holeIndex], [field]: value };
    setEditedRound(updatedScores);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get confidence icon
  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <Check size={16} className="text-green-600" />;
    if (confidence >= 0.6) return <AlertTriangle size={16} className="text-yellow-600" />;
    return <X size={16} className="text-red-600" />;
  };

  // Validate data before save
  const validateData = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!editedCourse?.courseName?.trim()) {
      newErrors.courseName = 'Course name is required';
    }

    if (editedCourse?.holeDetails) {
      editedCourse.holeDetails.forEach((hole, index) => {
        if (!hole.par || hole.par < 3 || hole.par > 5) {
          newErrors[`hole-${index}-par`] = 'Par must be 3-5';
        }
      });
    }

    if (editedRound.length > 0) {
      editedRound.forEach((score, index) => {
        if (score.score !== null && (score.score < 1 || score.score > 15)) {
          newErrors[`score-${index}`] = 'Score must be 1-15';
        }
        if (score.putts !== null && score.putts !== undefined && (score.putts < 0 || score.putts > 10)) {
          newErrors[`putts-${index}`] = 'Putts must be 0-10';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateData() || !editedCourse) return;

    // Convert to Course object
    const course: Course = {
      id: `course-${Date.now()}`,
      name: editedCourse.courseName,
      location: {
        address: editedCourse.location,
        city: editedCourse.location?.split(',')[0]?.trim(),
        state: editedCourse.location?.split(',')[1]?.trim()
      },
      holes: editedCourse.holeDetails.map(detail => ({
        number: detail.holeNumber,
        par: detail.par,
        handicap: detail.handicap || 1,
        yardages: detail.distance ? { regular: detail.distance } : ({} as {[key: string]: number})
      })),
      par: editedCourse.totalPar,
      confidence: editedCourse.confidence
    };

    // Convert to Round object if round data exists
    let round: Round | undefined;
    if (editedRound.length > 0) {
      round = {
        courseId: course.id,
        date: new Date().toISOString().split('T')[0],
        teeBox: 'Regular',
        holeScores: editedRound
          .filter(score => score.score !== null)
          .map(score => ({
            holeNumber: score.holeNumber,
            score: score.score!,
            putts: score.putts || undefined,
            fairwayHit: undefined,
            greenInRegulation: undefined,
            penaltyStrokes: 0
          })),
        confidence: editedRound.reduce((sum, s) => sum + s.confidence, 0) / editedRound.length
      };
    }

    onSave(course, round);
  };

  if (!editedCourse) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No course data to review</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Review Extracted Data</h2>
        <div className="flex items-center gap-2">
          {getConfidenceIcon(editedCourse.confidence)}
          <span className={`text-sm font-medium ${getConfidenceColor(editedCourse.confidence)}`}>
            {Math.round(editedCourse.confidence * 100)}% confidence
          </span>
        </div>
      </div>

      {/* Course Metadata Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">Course Information</h3>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Name *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedCourse.courseName}
                onChange={(e) => updateCourseField('courseName', e.target.value)}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.courseName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter course name"
              />
              {getConfidenceIcon(editedCourse.confidence)}
            </div>
            {errors.courseName && (
              <p className="text-red-500 text-sm mt-1">{errors.courseName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedCourse.location || ''}
                onChange={(e) => updateCourseField('location', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City, State"
              />
              {getConfidenceIcon(editedCourse.confidence)}
            </div>
          </div>
        </div>

        {/* Holes Table */}
        <div className="overflow-x-auto">
          <h4 className="text-lg font-medium mb-4">Hole Details</h4>
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Hole</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Par *</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Yardage</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Handicap</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {editedCourse.holeDetails.map((hole, index) => (
                <tr key={hole.holeNumber} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    {hole.holeNumber}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={hole.par}
                      onChange={(e) => updateHoleDetail(index, 'par', parseInt(e.target.value) || 0)}
                      className={`w-16 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[`hole-${index}-par`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      min="3"
                      max="5"
                    />
                    {errors[`hole-${index}-par`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`hole-${index}-par`]}</p>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={hole.distance || ''}
                      onChange={(e) => updateHoleDetail(index, 'distance', parseInt(e.target.value) || undefined)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="yards"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={hole.handicap || ''}
                      onChange={(e) => updateHoleDetail(index, 'handicap', parseInt(e.target.value) || undefined)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="18"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <div className="flex items-center gap-1">
                      {getConfidenceIcon(editedCourse.confidence)}
                      <span className={`text-sm ${getConfidenceColor(editedCourse.confidence)}`}>
                        {Math.round(editedCourse.confidence * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Total Par: <span className="font-medium">{editedCourse.totalPar}</span>
        </div>
      </div>

      {/* Round Data Section */}
      {editedRound.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6">Round Scores</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Hole</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Score</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Putts</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {editedRound.map((score, index) => (
                  <tr key={score.holeNumber} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {score.holeNumber}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={score.score || ''}
                        onChange={(e) => updateRoundScore(index, 'score', parseInt(e.target.value) || null)}
                        className={`w-16 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors[`score-${index}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        min="1"
                        max="15"
                      />
                      {errors[`score-${index}`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`score-${index}`]}</p>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={score.putts || ''}
                        onChange={(e) => updateRoundScore(index, 'putts', parseInt(e.target.value) || null)}
                        className={`w-16 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors[`putts-${index}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        min="0"
                        max="10"
                      />
                      {errors[`putts-${index}`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`putts-${index}`]}</p>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex items-center gap-1">
                        {getConfidenceIcon(score.confidence)}
                        <span className={`text-sm ${getConfidenceColor(score.confidence)}`}>
                          {Math.round(score.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
        >
          <Save size={20} />
          Save Data
        </button>
      </div>
    </div>
  );
};

export default DataReview;