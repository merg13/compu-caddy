import React from 'react';
import { MapPin, Plus, Home, Camera } from 'lucide-react';

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

interface CoursesProps {
  courses: Course[];
  rounds: Round[];
  setHomeCourse: (courseId: string) => Promise<void>;
  setCurrentView: (view: string) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

function Courses({ courses, rounds, setHomeCourse, setCurrentView, showNotification }: CoursesProps) {
  const handleSetHomeCourse = async (courseId: string) => {
    try {
      await setHomeCourse(courseId);
      showNotification('Home course updated', 'success');
    } catch (error) {
      showNotification('Error updating home course', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentView('scorecard-import')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Camera size={20} />
            Import from Scorecard
          </button>
          <button
            onClick={() => setCurrentView('search')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Course
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{course.name}</h3>
                <p className="text-sm text-gray-600">
                  {course.location.city}, {course.location.state}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {course.holes?.length || 18} holes · Par {course.par || 72}
                </p>
                {course.courseRating && course.slopeRating && (
                  <p className="text-xs text-blue-600 mt-1">
                    Rating: {course.courseRating} · Slope: {course.slopeRating}
                  </p>
                )}
              </div>
              {course.isHomeCourse && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                  <Home size={14} />
                  Home
                </span>
              )}
            </div>

            <div className="text-sm text-gray-600 mb-4">
              Rounds played: {rounds.filter(r => r.courseId === course.id).length}
            </div>

            {!course.isHomeCourse && (
              <button
                onClick={() => handleSetHomeCourse(course.id)}
                className="w-full px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
              >
                Set as Home Course
              </button>
            )}
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No courses added yet</p>
          <button
            onClick={() => setCurrentView('search')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Course
          </button>
        </div>
      )}
    </div>
  );
}

export default Courses;