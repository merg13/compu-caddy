import React, { memo } from 'react';
import { MapPin, Home } from 'lucide-react';

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

interface NewRoundProps {
  courses: Course[];
  startNewRound: (course: Course) => void;
  setCurrentView: (view: string) => void;
}

function NewRound({ courses, startNewRound, setCurrentView }: NewRoundProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Start New Round</h2>

      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{course.name}</h3>
                <p className="text-sm text-gray-600">
                  {course.location.city}, {course.location.state}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {course.holes?.length || 18} holes · Par {course.par || 72}
                </p>
              </div>
              {course.isHomeCourse && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                  <Home size={14} />
                  Home
                </span>
              )}
            </div>

            <button
              onClick={() => startNewRound(course)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              aria-label={`Start a round at ${course.name}`}
            >
              Start Round
            </button>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No courses available</p>
          <button
            onClick={() => setCurrentView('search')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            aria-label="Search and add a new golf course"
          >
            Add a Course
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(NewRound);