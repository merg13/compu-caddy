import React from 'react';
import { LineChart, Line, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Home } from 'lucide-react';

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

interface HoleAverage {
  hole: number;
  avgScore: number;
  par: number;
  count: number;
  toPar?: number;
}

interface HomeCourseStats {
  homeRounds: Round[];
  homeHoles: any[];
  holeAverages: HoleAverage[];
  avgScore: number;
  bestScore: number | null;
}

interface HomeCourseProps {
  homeCourse: Course | null | undefined;
  homeCourseStats: HomeCourseStats | null | undefined;
  setCurrentView: (view: string) => void;
}

function HomeCourse({ homeCourse, homeCourseStats, setCurrentView }: HomeCourseProps) {
  if (!homeCourse || !homeCourseStats) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <Home size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">No home course set</p>
        <button
          onClick={() => setCurrentView('courses')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Set Home Course
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{homeCourse.name}</h2>
        <p className="text-gray-600">
          {homeCourse.location.city}, {homeCourse.location.state} · Par {homeCourse.par}
        </p>
        {homeCourse.courseRating && homeCourse.slopeRating && (
          <p className="text-sm text-blue-600 mt-1">
            Course Rating: {homeCourse.courseRating} · Slope Rating: {homeCourse.slopeRating}
          </p>
        )}
        {(homeCourse.frontNineRating || homeCourse.backNineRating) && (
          <p className="text-xs text-gray-500 mt-1">
            Front 9: {homeCourse.frontNineRating || 'N/A'} · Back 9: {homeCourse.backNineRating || 'N/A'}
          </p>
        )}
      </div>

      {/* Home Course Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Rounds Played</div>
          <div className="text-3xl font-bold text-blue-600">{homeCourseStats.homeRounds.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Course Average</div>
          <div className="text-3xl font-bold text-green-600">{homeCourseStats.avgScore.toFixed(1)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Best Score</div>
          <div className="text-3xl font-bold text-purple-600">{homeCourseStats.bestScore || 'N/A'}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Course Record</div>
          <div className="text-3xl font-bold text-orange-600">
            {homeCourseStats.bestScore ? (homeCourseStats.bestScore - homeCourse.par >= 0 ? '+' : '') + (homeCourseStats.bestScore - homeCourse.par) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Hole Performance Map */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Hole-by-Hole Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={homeCourseStats.holeAverages}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hole" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="par" fill="#d1d5db" name="Par" />
            <Bar dataKey="avgScore" fill="#3b82f6" name="Your Avg" />
            <Line type="monotone" dataKey="toPar" stroke="#ef4444" strokeWidth={2} name="To Par" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Problem Holes */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-red-600">Most Challenging Holes</h3>
          <div className="space-y-2">
            {homeCourseStats.holeAverages
              .filter(h => h.count > 0)
              .sort((a, b) => (b.toPar || 0) - (a.toPar || 0))
              .slice(0, 5)
              .map((hole) => (
                <div key={hole.hole} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <span className="font-semibold">Hole {hole.hole}</span>
                    <span className="text-sm text-gray-600 ml-2">Par {hole.par}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      {(hole.toPar || 0) >= 0 ? '+' : ''}{(hole.toPar || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Avg: {hole.avgScore.toFixed(2)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-green-600">Best Scoring Holes</h3>
          <div className="space-y-2">
            {homeCourseStats.holeAverages
              .filter(h => h.count > 0)
              .sort((a, b) => (a.toPar || 0) - (b.toPar || 0))
              .slice(0, 5)
              .map((hole) => (
                <div key={hole.hole} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <span className="font-semibold">Hole {hole.hole}</span>
                    <span className="text-sm text-gray-600 ml-2">Par {hole.par}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {(hole.toPar || 0) >= 0 ? '+' : ''}{(hole.toPar || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Avg: {hole.avgScore.toFixed(2)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Score Progression */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Score Progression at Home Course</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={homeCourseStats.homeRounds.map((r, i) => ({
            round: i + 1,
            score: r.totalScore,
            date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="round" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default HomeCourse;