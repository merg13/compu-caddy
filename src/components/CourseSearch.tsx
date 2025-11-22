import React, { useState } from 'react';
import { Search } from 'lucide-react';

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

interface GolfCourseAPI {
  searchCourses: (query: string) => Promise<any[]>;
}

interface CourseSearchProps {
  api: GolfCourseAPI;
  handleImportCourse: (course: any) => Promise<Course>;
  setSearchResults: (results: any[]) => void;
  searchResults: any[];
  setSearchQuery: (query: string) => void;
  searchQuery: string;
  setCurrentView: (view: string) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

function CourseSearch({
  api,
  handleImportCourse,
  setSearchResults,
  searchResults,
  setSearchQuery,
  searchQuery,
  setCurrentView,
  showNotification
}: CourseSearchProps) {
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await api.searchCourses(searchQuery);
      setSearchResults(results);
    } catch (error) {
      showNotification((error as Error).message || 'Error searching courses', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const onImportCourse = async (course: any) => {
    try {
      await handleImportCourse(course);
      setSearchResults([]);
      setSearchQuery('');
      showNotification(`${course.name} imported successfully!`, 'success');
      setCurrentView('courses');
    } catch (error) {
      showNotification('Error importing course', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Add Course</h2>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a golf course..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Search size={20} />
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Search for golf courses by name or location. Powered by GolfCourseAPI.com
        </p>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">Search Results</h3>
            {searchResults.map((course) => (
              <div key={course.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                <div>
                  <div className="font-semibold">{course.name}</div>
                  <div className="text-sm text-gray-600">
                    {course.city}, {course.state}, {course.country}
                  </div>
                  <div className="text-xs text-gray-500">
                    {course.holes} holes · Par {course.par}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Course details will be loaded upon import
                  </div>
                </div>
                <button
                  onClick={() => onImportCourse(course)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Import
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseSearch;