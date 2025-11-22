import React, { memo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area } from 'recharts';
import { Plus } from 'lucide-react';

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
}

interface ScoreTrendData {
  round: number;
  score: number;
  date: string;
}

interface ScoreDistributionData {
  name: string;
  value: number;
  fill: string;
  [key: string]: any; // Index signature for recharts compatibility
}

interface ParTypeData {
  parType: string;
  avgScore: number;
  par: number;
}

interface GameProfileData {
  category: string;
  value: number;
}

interface StrokesGainedData {
  category: string;
  value: number;
  fill: string;
}

interface DashboardProps {
  courses: Course[];
  stats: Stats;
  scoreTrendData: ScoreTrendData[];
  scoreDistributionData: ScoreDistributionData[];
  parTypeData: ParTypeData[];
  gameProfileData: GameProfileData[];
  strokesGainedData: StrokesGainedData[];
  setCurrentView: (view: string) => void;
}

function Dashboard({
  courses,
  stats,
  scoreTrendData,
  scoreDistributionData,
  parTypeData,
  gameProfileData,
  strokesGainedData,
  setCurrentView
}: DashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        {courses.length > 0 && (
          <button
            onClick={() => setCurrentView('newRound')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            aria-label="Start a new golf round"
          >
            <Plus size={20} />
            New Round
          </button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Scoring Avg</div>
          <div className="text-3xl font-bold text-blue-600">{stats.scoringAvg.toFixed(1)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Handicap</div>
          <div className="text-3xl font-bold text-green-600">{stats.handicap || 'N/A'}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">GIR %</div>
          <div className="text-3xl font-bold text-purple-600">{stats.girPct.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">FIR %</div>
          <div className="text-3xl font-bold text-orange-600">{stats.firPct.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Rounds</div>
          <div className="text-3xl font-bold text-indigo-600">{courses.length}</div>
        </div>
      </div>

      {/* Score Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Score Trend (Last 15 Rounds)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart
            data={scoreTrendData}
            role="img"
            aria-label="Score trend chart showing scores over the last 15 rounds"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[65, 95]} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="score" fill="#3b82f64d" stroke="#3b82f6" />
            <Line type="monotone" dataKey="score" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart role="img" aria-label="Pie chart showing score distribution">
              <Pie
                data={scoreDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {scoreDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Par Type Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Performance by Par Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={parTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="parType" />
              <YAxis domain={[0, 7]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgScore" fill="#8b5cf6" />
              <Bar dataKey="par" fill="#d1d5db" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Game Profile and Strokes Gained */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Game Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={gameProfileData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Performance" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Strokes Gained (Simplified)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={strokesGainedData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default memo(Dashboard);