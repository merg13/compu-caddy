import React, { useState, useEffect } from 'react';
import { X, Save, ChevronLeft, ChevronRight, Mic } from 'lucide-react';

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Import types from useGolfData
interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface Hole {
  number: number;
  par: number;
  handicap: number;
  yardages: { [key: string]: number };
}

interface Course {
  id: string;
  apiId?: string;
  name: string;
  location: Location;
  isHomeCourse: boolean;
  imported: boolean;
  importDate?: string;
  holes: Hole[];
  teeBoxes?: any;
  par: number;
  courseRating?: number;
  slopeRating?: number;
  bogeyRating?: number;
  frontNineRating?: number;
  backNineRating?: number;
  lastModified?: number;
}

interface HoleScore {
  holeNumber: number;
  score: number | null;
  putts: number | null;
  fairwayHit: string;
  greenInRegulation: boolean;
  penaltyStrokes: number;
}

interface RoundData {
  date: string;
  teeBox: string;
  weather: string;
  playingPartners: string;
}

interface ExistingRound {
  holeScores: HoleScore[];
}

interface ScorecardProps {
  course: Course;
  onSave: (roundData: any, course: Course) => void;
  onCancel: () => void;
  existingRound?: ExistingRound;
}

// Scorecard Component for Round Entry
function Scorecard({ course, onSave, onCancel, existingRound }: ScorecardProps) {
  const [currentHole, setCurrentHole] = useState(1);
  const [roundData, setRoundData] = useState<RoundData>({
    date: new Date().toISOString().split('T')[0],
    teeBox: course.teeBoxes?.[0]?.name || 'Blue', // Default to Blue tee
    weather: '',
    playingPartners: ''
  });
  const [holeScores, setHoleScores] = useState<HoleScore[]>(

    existingRound?.holeScores || Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      score: null,
      putts: null,
      fairwayHit: 'n/a',
      greenInRegulation: false,
      penaltyStrokes: 0
    }))
  );

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Long press state
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('scorecard-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.courseId === course.id && !existingRound) {
          setRoundData(parsed.roundData);
          setHoleScores(parsed.holeScores);
        }
      } catch (e) {
        // Ignore invalid draft
      }
    }
  }, [course.id, existingRound]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const draft = {
        courseId: course.id,
        roundData,
        holeScores,
        timestamp: Date.now()
      };
      localStorage.setItem('scorecard-draft', JSON.stringify(draft));
    }, 30000);

    return () => clearInterval(interval);
  }, [course.id, roundData, holeScores]);
  const currentHoleData = holeScores[currentHole - 1];
  const courseHole = course.holes?.[currentHole - 1];

  const getCurrentTeeInfo = () => {
    return course.teeBoxes?.find((tee: any) => tee.name === roundData.teeBox);
  };

  const getCurrentTeeYardage = () => {
    if (!courseHole?.yardages) return 0;
    const teeInfo = getCurrentTeeInfo();
    if (!teeInfo) return courseHole.yardages.regular || 0;

    // For now, return the championship yardage as it's the most accurate
    // In a full implementation, we'd map tee names to specific yardages
    return courseHole.yardages.championship || courseHole.yardages.regular || 0;
  };

  const updateHoleScore = (field: keyof HoleScore, value: any) => {
    const updated = [...holeScores];
    updated[currentHole - 1] = { ...updated[currentHole - 1], [field]: value };
    setHoleScores(updated);
  };

  // Haptic feedback helper
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentHole < 18) {
      setCurrentHole(currentHole + 1);
      triggerHapticFeedback();
    }
    if (isRightSwipe && currentHole > 1) {
      setCurrentHole(currentHole - 1);
      triggerHapticFeedback();
    }
  };

  // Voice input for score
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const numberMatch = transcript.match(/\d+/);
      if (numberMatch) {
        const score = parseInt(numberMatch[0]);
        if (score >= 1 && score <= 15) {
          updateHoleScore('score', score);
          triggerHapticFeedback();
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSave = () => {
    const totalScore = holeScores.reduce((sum, h) => sum + (h.score || 0), 0);
    const par = course.holes?.reduce((sum, h) => sum + h.par, 0) || 72;

    onSave({
      ...roundData,
      totalScore,
      scoreToPar: totalScore - par,
      differential: totalScore - par,
      holeScores
    }, course);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 landscape:flex landscape:flex-row landscape:gap-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{course.name}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700" aria-label="Close scorecard">
          <X size={24} />
        </button>
      </div>

      {/* Round Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={roundData.date}
            onChange={(e) => setRoundData({ ...roundData, date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tee Box</label>
          <select
            value={roundData.teeBox}
            onChange={(e) => setRoundData({ ...roundData, teeBox: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {course.teeBoxes?.map((tee: any) => (
              <option key={tee.name} value={tee.name}>
                {tee.name} - Rating: {tee.rating}, Slope: {tee.slope}, {tee.totalYards} yards
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hole Navigation */}
      <div
        className="bg-gray-50 rounded-lg p-4 mb-6"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' && currentHole > 1) {
            setCurrentHole(currentHole - 1);
          } else if (e.key === 'ArrowRight' && currentHole < 18) {
            setCurrentHole(currentHole + 1);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        tabIndex={0}
        role="region"
        aria-label="Hole navigation"
        style={{ touchAction: 'pan-y' }} // Allow vertical scrolling but prevent horizontal scroll
      >
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              setCurrentHole(Math.max(1, currentHole - 1));
              triggerHapticFeedback();
            }}
            disabled={currentHole === 1}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            aria-label="Previous hole"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <div className="text-2xl font-bold">Hole {currentHole}</div>
            <div className="text-sm text-gray-600">
              Par {courseHole?.par || 4} • {getCurrentTeeYardage()} yards
            </div>
            {getCurrentTeeInfo() && (
              <div className="text-xs text-blue-600">
                {getCurrentTeeInfo().name} Tee • Rating: {getCurrentTeeInfo().rating}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setCurrentHole(Math.min(18, currentHole + 1));
              triggerHapticFeedback();
            }}
            disabled={currentHole === 18}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            aria-label="Next hole"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Score Input */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Score</label>
            <div className="flex items-center gap-2">
              <button
                onTouchStart={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('score', (currentHoleData.score || 0) - 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onTouchEnd={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('score', (currentHoleData.score || 0) - 1);
                    triggerHapticFeedback();
                  }
                }}
                onMouseDown={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('score', (currentHoleData.score || 0) - 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onMouseUp={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('score', (currentHoleData.score || 0) - 1);
                    triggerHapticFeedback();
                  }
                }}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                aria-label="Decrease score"
              >
                -
              </button>
              <input
                type="number"
                value={currentHoleData.score || ''}
                onChange={(e) => updateHoleScore('score', parseInt(e.target.value) || null)}
                className="flex-1 px-4 py-3 text-2xl font-bold border rounded-lg text-center"
                min="1"
                max="15"
                inputMode="numeric"
              />
              <button
                onClick={startVoiceInput}
                className={`px-3 py-2 rounded-lg ${isListening ? 'bg-red-500 text-white' : 'bg-gray-500 text-white hover:bg-gray-600'}`}
                aria-label="Voice input for score"
              >
                <Mic size={16} />
              </button>
              <button
                onTouchStart={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('score', (currentHoleData.score || 0) + 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onTouchEnd={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('score', (currentHoleData.score || 0) + 1);
                    triggerHapticFeedback();
                  }
                }}
                onMouseDown={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('score', (currentHoleData.score || 0) + 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onMouseUp={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('score', (currentHoleData.score || 0) + 1);
                    triggerHapticFeedback();
                  }
                }}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                aria-label="Increase score"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Putts</label>
            <div className="flex items-center gap-2">
              <button
                onTouchStart={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('putts', (currentHoleData.putts || 0) - 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onTouchEnd={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('putts', (currentHoleData.putts || 0) - 1);
                    triggerHapticFeedback();
                  }
                }}
                onMouseDown={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('putts', (currentHoleData.putts || 0) - 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onMouseUp={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('putts', (currentHoleData.putts || 0) - 1);
                    triggerHapticFeedback();
                  }
                }}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                aria-label="Decrease putts"
              >
                -
              </button>
              <input
                type="number"
                value={currentHoleData.putts || ''}
                onChange={(e) => updateHoleScore('putts', parseInt(e.target.value) || null)}
                className="flex-1 px-4 py-3 text-2xl font-bold border rounded-lg text-center"
                min="0"
                max="10"
                inputMode="numeric"
              />
              <button
                onTouchStart={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('putts', (currentHoleData.putts || 0) + 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onTouchEnd={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('putts', (currentHoleData.putts || 0) + 1);
                    triggerHapticFeedback();
                  }
                }}
                onMouseDown={() => {
                  const timer = setInterval(() => {
                    updateHoleScore('putts', (currentHoleData.putts || 0) + 1);
                    triggerHapticFeedback();
                  }, 200);
                  setLongPressTimer(timer);
                  setIsLongPressing(true);
                }}
                onMouseUp={() => {
                  if (longPressTimer) clearInterval(longPressTimer);
                  setLongPressTimer(null);
                  setIsLongPressing(false);
                  if (!isLongPressing) {
                    updateHoleScore('putts', (currentHoleData.putts || 0) + 1);
                    triggerHapticFeedback();
                  }
                }}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                aria-label="Increase putts"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Quick Score Buttons */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Quick Scores</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Par', value: courseHole?.par || 4 },
              { label: 'Birdie', value: (courseHole?.par || 4) - 1 },
              { label: 'Bogey', value: (courseHole?.par || 4) + 1 },
              { label: 'Double', value: (courseHole?.par || 4) + 2 },
            ].map((quick) => (
              <button
                key={quick.label}
                onClick={() => {
                  updateHoleScore('score', quick.value);
                  triggerHapticFeedback();
                }}
                className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium"
              >
                {quick.label} ({quick.value})
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {courseHole?.par !== 3 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Fairway</label>
            <div className="flex gap-2" role="radiogroup" aria-label="Fairway hit options">
              {['yes', 'no', 'n/a'].map(opt => (
                <button
                  key={opt}
                  onClick={() => {
                    updateHoleScore('fairwayHit', opt);
                    triggerHapticFeedback();
                  }}
                  className={`flex-1 py-2 rounded-lg ${
                    currentHoleData.fairwayHit === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  role="radio"
                  aria-checked={currentHoleData.fairwayHit === opt}
                  aria-label={`Fairway ${opt}`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium">Green in Regulation</label>
          <button
            onClick={() => {
              updateHoleScore('greenInRegulation', !currentHoleData.greenInRegulation);
              triggerHapticFeedback();
            }}
            className={`px-4 py-2 rounded-lg ${
              currentHoleData.greenInRegulation
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            aria-label={`Green in regulation: ${currentHoleData.greenInRegulation ? 'Yes' : 'No'}`}
            role="switch"
            aria-checked={currentHoleData.greenInRegulation}
          >
            {currentHoleData.greenInRegulation ? 'Yes' : 'No'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Penalty Strokes</label>
          <input
            type="number"
            value={currentHoleData.penaltyStrokes}
            onChange={(e) => updateHoleScore('penaltyStrokes', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border rounded-lg"
            min="0"
            max="10"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* Hole Grid */}
      <div className="grid grid-cols-9 gap-2 mb-6" role="tablist" aria-label="Hole selection grid">
        {holeScores.map((hole, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentHole(idx + 1);
              triggerHapticFeedback();
            }}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm ${
              currentHole === idx + 1
                ? 'bg-blue-600 text-white'
                : hole.score
                ? 'bg-green-100 hover:bg-green-200'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            role="tab"
            aria-selected={currentHole === idx + 1}
            aria-label={`Hole ${idx + 1}${hole.score ? `, score ${hole.score}` : ', not scored'}`}
          >
            <div className="font-bold">{idx + 1}</div>
            {hole.score && <div className="text-xs">{hole.score}</div>}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Total Score</div>
            <div className="text-2xl font-bold">
              {holeScores.reduce((sum, h) => sum + (h.score || 0), 0) || '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">To Par</div>
            <div className="text-2xl font-bold">
              {holeScores.reduce((sum, h) => sum + (h.score || 0), 0)
                ? (holeScores.reduce((sum, h) => sum + (h.score || 0), 0) - (course.par || 72)) >= 0
                  ? '+' + (holeScores.reduce((sum, h) => sum + (h.score || 0), 0) - (course.par || 72))
                  : (holeScores.reduce((sum, h) => sum + (h.score || 0), 0) - (course.par || 72))
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Putts</div>
            <div className="text-2xl font-bold">
              {holeScores.reduce((sum, h) => sum + (h.putts || 0), 0) || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            handleSave();
            triggerHapticFeedback();
          }}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          aria-label="Save the golf round"
        >
          <Save size={20} />
          Save Round
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          aria-label="Cancel and discard the round"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default Scorecard;