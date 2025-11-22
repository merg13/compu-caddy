import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trash2 } from 'lucide-react';

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

interface Round {
  id: string;
  courseId: string;
  date: string;
  teeBox: string;
  totalScore: number;
  scoreToPar: number;
  differential: number;
  completed: boolean;
}

interface HoleScore {
  id: string;
  roundId: string;
  holeNumber: number;
  score: number;
  putts: number;
  fairwayHit: string;
  greenInRegulation: boolean;
  penaltyStrokes: number;
}

interface Stats {
  scoringAvg: number;
  girPct: number;
  firPct: number;
  puttingAvg: number;
  handicap: number | null;
  distribution: {
    birdiesOrBetter: number;
    pars: number;
    bogeys: number;
    doubles: number;
    others: number;
  };
  strokesGained: {
    offTee: number;
    approach: number;
    shortGame: number;
    putting: number;
  };
  scramblingPct: number;
  sandSavePct: number;
  onePuttPct: number;
  birdieAvg: number;
  bogeyAvoidancePct: number;
}

interface AnalyticsProps {
  stats: Stats;
  holeScores: HoleScore[];
  rounds: Round[];
  courses: Course[];
  deleteRound: (roundId: string) => Promise<void>;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

function Analytics({ stats, holeScores, rounds, courses, deleteRound, showNotification }: AnalyticsProps) {
  const [selectedHole, setSelectedHole] = React.useState<number | null>(null);

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm('Delete this round?')) return;

    try {
      await deleteRound(roundId);
      showNotification('Round deleted', 'success');
    } catch (error) {
      showNotification('Error deleting round', 'error');
    }
  };

  const handleBarClick = (data: any) => {
    setSelectedHole(data.hole);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Advanced Analytics</h2>

      {/* Detailed Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">FIR Percentage</div>
          <div className="text-2xl font-bold text-blue-600">{stats.firPct.toFixed(1)}%</div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${stats.firPct}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">Avg Putts/Round</div>
          <div className="text-2xl font-bold text-purple-600">{(stats.puttingAvg * 18).toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.puttingAvg.toFixed(2)} per hole
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">Best Round</div>
          <div className="text-2xl font-bold text-green-600">
            {rounds.length > 0 ? Math.min(...rounds.map(r => r.totalScore)) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Worst: {rounds.length > 0 ? Math.max(...rounds.map(r => r.totalScore)) : 'N/A'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">3-Putt Rate</div>
          <div className="text-2xl font-bold text-red-600">
            {((holeScores.filter(h => h.putts >= 3).length / Math.max(holeScores.length, 1)) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Hole-by-Hole Analysis */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Hole-by-Hole Performance (All Courses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Array.from({ length: 18 }, (_, i) => {
            const holeNum = i + 1;
            const holesData = holeScores.filter(h => h.holeNumber === holeNum);
            const avgScore = holesData.length > 0
              ? holesData.reduce((sum, h) => sum + h.score, 0) / holesData.length
              : 0;
            return { hole: holeNum, avgScore: parseFloat(avgScore.toFixed(2)) };
          })}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hole" />
            <YAxis domain={[0, 6]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#3b82f6" onClick={handleBarClick} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Drill-down Details */}
      {selectedHole && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Hole {selectedHole} Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Score Distribution</h4>
              <div className="space-y-1">
                {Array.from({ length: 8 }, (_, i) => i + 2).map(score => {
                  const count = holeScores.filter(h => h.holeNumber === selectedHole && h.score === score).length;
                  return (
                    <div key={score} className="flex justify-between">
                      <span>{score} strokes</span>
                      <span>{count} times</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Recent Scores</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {holeScores
                  .filter(h => h.holeNumber === selectedHole)
                  .slice(-5)
                  .reverse()
                  .map((score, idx) => (
                    <div key={idx} className="text-sm">
                      {new Date(rounds.find(r => r.id === score.roundId)?.date || '').toLocaleDateString()}: {score.score}
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedHole(null)}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close Details
          </button>
        </div>
      )}

      {/* Recent Rounds */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Rounds</h3>
        <div className="space-y-2">
          {rounds.slice(-10).reverse().map((round) => {
            const course = courses.find(c => c.id === round.courseId);
            return (
              <div key={round.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{course?.name || 'Unknown Course'}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(round.date).toLocaleDateString()} · {round.teeBox}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-xl font-bold ${
                    round.scoreToPar <= 0 ? 'text-green-600' :
                    round.scoreToPar <= 5 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {round.totalScore}
                  </div>
                  <div className="text-sm text-gray-600">
                    {round.scoreToPar >= 0 ? '+' : ''}{round.scoreToPar}
                  </div>
                  <button
                    onClick={() => handleDeleteRound(round.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Analytics;